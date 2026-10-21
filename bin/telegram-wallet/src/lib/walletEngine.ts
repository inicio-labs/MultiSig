import {
  AccountInspector,
  isProposalActionable,
  type ConsumableNote,
  type Multisig,
  type Proposal,
  type Signer,
  type VaultBalance,
} from '@openzeppelin/miden-multisig-client';
import type { HistoryEntry } from '@openzeppelin/guardian-client';
import { NoteType } from '@miden-sdk/miden-sdk';
import { describeExecutionError, formatError } from './errors';
import {
  clearExecutionPushed,
  executionWasPushed,
  findLockedCandidate,
  isPendingCandidateError,
  msUntilUnlockable,
  releasePendingCandidate,
  type ReleaseOutcome,
} from './pendingCandidate';
import type { MultisigHooks } from './multisigApi';
import type { PrivateNotes } from './privateSend';

/** The parts of the Miden client the engine uses. */
export interface WalletMidenClient {
  sync(): Promise<unknown>;
  syncChain(): Promise<unknown>;
  feeFaucetId(): Promise<{ toString(): string; free?(): void }>;
  notes: { fetchPrivate(): Promise<void> };
}

/** The parts of the multisig client the engine uses. */
export interface WalletMultisigClient {
  recoverByKey(signer: Signer): Promise<Array<{ accountId: string; state: { updatedAt: string } }>>;
}

export interface WalletEngineDeps<C extends WalletMidenClient, M extends WalletMultisigClient> {
  signer: Signer;
  startMidenClient(): Promise<C>;
  createMultisigClient(midenClient: C): M;
  createAccount(multisigClient: M, signer: Signer, hooks: MultisigHooks): Promise<Multisig>;
  loadAccount(multisigClient: M, accountId: string, signer: Signer, hooks: MultisigHooks): Promise<Multisig>;
  /** Registers a new account with the node; `invitationCode` on an invite-only network. */
  registerOnNode(midenClient: C, accountId: string, invitationCode?: string): Promise<void>;
  /**
   * Invite-only network (private mainnet): true when this new account still
   * needs a code from the user before it can register. Absent: never asks.
   */
  needsInvitation?(midenClient: C, accountId: string): Promise<boolean>;
  /** Whether the node would accept this invite code (unknown or used: false); asked before registering. */
  checkInvitationCode?(midenClient: C, code: string): Promise<boolean>;
  registerNoteTag(midenClient: C, accountId: string): Promise<void>;
  /** How long each step of a transaction took (diagnostics). */
  trace?(label: string, ms: number): void;
  /**
   * A Guardian session on this client (resumed from the phone, else started
   * with one wallet signature): reads and proposal requests are then signed by
   * a browser key instead of the wallet. Failing is fine: the wallet signs.
   */
  startSession?(multisigClient: M): Promise<string | void>;
  /** Waits between automatic start retries (tests pass zeros). */
  startRetryDelaysMs?: number[];
  /** Private sends: note delivery and the check before each transaction. */
  createPrivateNotes?(midenClient: C): PrivateNotes;
  /** Remembers the account this key last used, to prefer it if the key has several. */
  storage?: { get(key: string): string | null; set(key: string, value: string): void };
  /** Whose saved home view this is (see savedView.ts); defaults to the signing key, null for none. */
  viewKey?: string | null;
  release?: typeof releasePendingCandidate;
}

export type WalletPhase =
  | { kind: 'starting' }
  | { kind: 'finding' }
  | { kind: 'creating' }
  /** Registering the never-used account with the node. */
  | { kind: 'registering' }
  /** Invite-only network: waiting for the user's invitation code (`error`: the last one was refused). */
  | { kind: 'invite'; error?: string }
  | { kind: 'ready' }
  | { kind: 'error'; message: string };

export type ActivityStep = 'preparing' | 'signing' | 'proving' | 'delivering' | 'syncing';

export interface WalletActivity {
  kind: 'send' | 'claim';
  step: ActivityStep;
}

/** One line of the Recent list, from Guardian's history of the account's transactions. */
export interface ActivityItem {
  id: string;
  direction: 'in' | 'out';
  faucetId: string;
  amount: bigint;
  /** The other account (sender of a received note, recipient of a sent one), when known. */
  counterparty?: string;
  timestamp: string;
  /** The network fee this transaction paid, on its first item only. */
  fee?: { faucetId: string; amount: bigint };
}

/**
 * Received and sent assets per transaction, newest first.
 * Output notes without a recipient are the transaction fee, not a payment.
 */
export function toActivity(entries: HistoryEntry[]): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const entry of entries) {
    const first = items.length;
    const notes = [
      ...entry.inputNotes.map((note) => ({ note, direction: 'in' as const, counterparty: note.sender })),
      ...entry.outputNotes
        .filter((note) => note.recipient)
        .map((note) => ({ note, direction: 'out' as const, counterparty: note.recipient })),
    ];
    for (const { note, direction, counterparty } of notes) {
      note.assets.forEach((asset, i) => {
        if (asset.kind !== 'fungible' || !asset.amount) return;
        items.push({
          id: `${entry.nonce}:${note.noteId}:${i}`,
          direction,
          faucetId: asset.assetId,
          amount: BigInt(asset.amount),
          counterparty,
          timestamp: entry.timestamp,
        });
      });
    }
    let fee: ActivityItem['fee'];
    for (const note of entry.outputNotes.filter((n) => !n.recipient)) {
      for (const asset of note.assets) {
        if (asset.kind !== 'fungible' || !asset.amount) continue;
        fee = { faucetId: asset.assetId, amount: (fee?.amount ?? 0n) + BigInt(asset.amount) };
      }
    }
    if (fee && items[first]) items[first] = { ...items[first], fee };
  }
  // Newest first by time: Guardian's page is not always in that order.
  return items
    .map((item, i) => ({ item, i, t: Date.parse(item.timestamp) }))
    .sort((a, b) => (b.t || 0) - (a.t || 0) || a.i - b.i)
    .map(({ item }) => item);
}

export interface WalletSnapshot {
  phase: WalletPhase;
  accountId: string | null;
  balances: VaultBalance[];
  incoming: ConsumableNote[];
  feeFaucetId: string | null;
  activity: WalletActivity | null;
  /** Recent transactions, newest first. */
  history: ActivityItem[];
  /** Something the user should know that is not an error (e.g. slow local proving). */
  notice: string | null;
  /**
   * While starting, balances and history are what this phone showed last
   * time, saved at this moment (ms); null once they are up to date.
   */
  savedAt: number | null;
}

/** The home screen as it last was, kept on this phone to show at once on the next open. */
interface SavedView {
  accountId: string;
  feeFaucetId: string | null;
  balances: Array<{ faucetId: string; amount: string }>;
  history: Array<Omit<ActivityItem, 'amount' | 'fee'> & { amount: string; fee?: { faucetId: string; amount: string } }>;
  savedAt: number;
}

export const LAST_VIEW_KEY = 'miden-tg-wallet:last-view:';

const LAST_ACCOUNT_KEY = 'miden-tg-wallet:last-account';

/**
 * A start that fails on something passing (the phone's local database
 * aborting a read while it sets itself up on a first launch, a network or
 * Guardian hiccup) is tried again on its own before any error shows: the
 * screen keeps "Updating…". Never while creating the account: a retry there
 * could make a second one.
 */
const START_RETRY_DELAYS_MS = [800, 2_000, 4_000];
const RETRY_PHASES = new Set<WalletPhase['kind']>(['starting', 'finding', 'registering']);
const PASSING_ERROR = /transaction aborted|aborterror|database-related|failed to fetch|load failed|network|timed? ?out|deadline|unavailable|\b50[234]\b/i;

/** What start() was doing, for the error a user can send us. */
const START_STEP: Partial<Record<WalletPhase['kind'], string>> = {
  starting: 'starting the Miden client',
  finding: 'looking up the account on Guardian',
  creating: 'creating the account',
  registering: 'registering the account on the network',
};

/**
 * The wallet's account lifecycle and transactions, without any UI.
 *
 * start(): find the 1-of-1 Guardian account for this key (any device), or
 * create one; a never-used account is registered on the node. The account
 * deploys with its first transaction. send()/claimAll(): every transaction of a
 * Guardian account is a proposal, even with one signer, so each runs the whole
 * create → sign → execute pipeline in one call.
 */
export class WalletEngine<C extends WalletMidenClient = WalletMidenClient, M extends WalletMultisigClient = WalletMultisigClient> {
  private snapshot: WalletSnapshot = {
    phase: { kind: 'starting' },
    accountId: null,
    balances: [],
    incoming: [],
    feeFaucetId: null,
    activity: null,
    history: [],
    notice: null,
    savedAt: null,
  };
  private readonly listeners = new Set<() => void>();
  private midenClient: C | null = null;
  private privateNotes: PrivateNotes | null = null;
  /**
   * The account nonce at which the last private-payment check passed. While
   * the nonce has not moved and nothing is waiting to be delivered, there is
   * nothing new to check: skips two Guardian calls (and their signatures).
   */
  private deliveryCheckedAt: bigint | null = null;
  private multisig: Multisig | null = null;
  private busy = false;
  private starting: Promise<void> | null = null;
  /**
   * Refreshes and transactions run one at a time: Guardian requires each
   * signed request's timestamp to be newer than the last, so overlapping
   * requests (slower with remote signing) get replay-rejected and retried.
   */
  private queue: Promise<unknown> = Promise.resolve();
  private readonly hooks: MultisigHooks = {
    onProverFallback: () => this.update({
      notice: 'The remote prover did not respond, so this phone is proving the transaction. This can take a few minutes; keep the app open.',
    }),
  };

  constructor(private readonly deps: WalletEngineDeps<C, M>) {
    // Opening shows the last balance and payments at once; the start brings them up to date.
    const saved = this.loadView();
    if (saved) this.snapshot = { ...this.snapshot, ...saved };
  }

  // Per user (Telegram account, else signing key): another user on this phone never sees it.
  private viewKey(): string | null {
    const key = this.deps.viewKey === undefined ? `key:${(this.deps.signer.commitment ?? '').toLowerCase()}` : this.deps.viewKey;
    return key === null ? null : LAST_VIEW_KEY + key;
  }

  private loadView(): Partial<WalletSnapshot> | null {
    const key = this.viewKey();
    if (!key) return null;
    try {
      const raw = this.deps.storage?.get(key);
      if (!raw) return null;
      const view = JSON.parse(raw) as SavedView;
      return {
        accountId: view.accountId,
        feeFaucetId: view.feeFaucetId,
        balances: view.balances.map((b) => ({ faucetId: b.faucetId, amount: BigInt(b.amount) })),
        history: view.history.map(({ amount, fee, ...item }) => ({
          ...item,
          amount: BigInt(amount),
          ...(fee ? { fee: { faucetId: fee.faucetId, amount: BigInt(fee.amount) } } : {}),
        })),
        savedAt: view.savedAt,
      };
    } catch {
      return null; // unreadable: start from an empty screen, as before
    }
  }

  private saveView(): void {
    const { accountId, feeFaucetId, balances, history } = this.snapshot;
    const key = this.viewKey();
    if (!accountId || !key) return;
    const view: SavedView = {
      accountId,
      feeFaucetId,
      balances: balances.map((b) => ({ faucetId: b.faucetId, amount: b.amount.toString() })),
      history: history.map(({ amount, fee, ...item }) => ({
        ...item,
        amount: amount.toString(),
        ...(fee ? { fee: { faucetId: fee.faucetId, amount: fee.amount.toString() } } : {}),
      })),
      savedAt: Date.now(),
    };
    this.deps.storage?.set(key, JSON.stringify(view));
  }

  getSnapshot = (): WalletSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private update(patch: Partial<WalletSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener();
  }

  /** Concurrent calls (e.g. React running an effect twice) share one start. */
  start(): Promise<void> {
    this.starting ??= this.run().finally(() => { this.starting = null; });
    return this.starting;
  }

  private async run(): Promise<void> {
    const delays = this.deps.startRetryDelaysMs ?? START_RETRY_DELAYS_MS;
    for (let attempt = 0; ; attempt++) {
      try {
        await this.startOnce();
        return;
      } catch (error) {
        const phase = this.snapshot.phase.kind;
        if (attempt < delays.length && RETRY_PHASES.has(phase) && PASSING_ERROR.test(formatError(error))) {
          console.warn(`Wallet start failed (${phase}); trying again`, error);
          await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
          continue;
        }
        const during = START_STEP[phase] ?? 'starting';
        this.update({ phase: { kind: 'error', message: formatError(error, `The wallet could not start (while ${during})`) } });
        return;
      }
    }
  }

  private async startOnce(): Promise<void> {
    {
      this.update({ phase: { kind: 'starting' }, notice: null });
      const midenClient = this.midenClient ?? await this.deps.startMidenClient();
      this.midenClient = midenClient;
      this.privateNotes ??= this.deps.createPrivateNotes?.(midenClient) ?? null;
      const multisigClient = this.deps.createMultisigClient(midenClient);
      this.update({ phase: { kind: 'finding' } });
      // Before the account loads: its reads then need no wallet signature.
      if (this.deps.startSession) {
        await this.timed('guardian session', () => this.deps.startSession!(multisigClient))
          .catch((error: unknown) => console.warn('No Guardian session; the wallet signs requests', error));
      }

      const multisig = this.multisig ?? await this.findOrCreate(multisigClient);
      this.multisig = multisig;
      this.deps.storage?.set(this.rememberedKey(), multisig.accountId);
      this.update({ accountId: multisig.accountId });

      // The account's note tag before the first sync: a sync without it moves
      // the client past notes that were sent to the account earlier.
      await this.deps.registerNoteTag(midenClient, multisig.accountId);
      await this.refresh();
      if (multisig.account.nonce().asInt() === 0n) {
        // The node only accepts transactions from registered accounts. A new
        // account registers here; one whose first start was interrupted is
        // registered again (idempotent). Whatever the network sends a new
        // account arrives as an ordinary incoming payment.
        // An invite-only network registers only with the user's code: wait for it.
        if (await this.deps.needsInvitation?.(midenClient, multisig.accountId)) {
          this.update({ phase: { kind: 'invite' } });
          return;
        }
        this.update({ phase: { kind: 'registering' } });
        await this.deps.registerOnNode(midenClient, multisig.accountId);
      }
      this.becomeReady(multisig);
    }
  }

  private becomeReady(multisig: Multisig): void {
    this.update({ phase: { kind: 'ready' } });
    // A private payment whose delivery the app did not finish (closed meanwhile).
    const privateNotes = this.privateNotes;
    if (privateNotes) {
      void this.exclusive(() => this.checkDeliveries(multisig, privateNotes))
        .catch((error) => console.warn('An earlier private payment is not delivered yet', error));
    }
  }

  /**
   * Invite-only network: registers the new account with the user's code and
   * opens the wallet. A refused code goes back to `invite` with the reason.
   */
  async submitInvitationCode(code: string): Promise<void> {
    const { midenClient, multisig } = this;
    const trimmed = code.trim();
    if (!midenClient || !multisig || this.snapshot.phase.kind !== 'invite') return;
    if (!trimmed) {
      this.update({ phase: { kind: 'invite', error: 'Enter your invite code.' } });
      return;
    }
    this.update({ phase: { kind: 'registering' } });
    try {
      // A clear answer for a mistyped or used code, before anything is sent.
      if (this.deps.checkInvitationCode && !(await this.deps.checkInvitationCode(midenClient, trimmed))) {
        this.update({ phase: { kind: 'invite', error: 'That code isn’t valid, or it was already used. Check it and try again.' } });
        return;
      }
      await this.deps.registerOnNode(midenClient, multisig.accountId, trimmed);
    } catch (error) {
      this.update({ phase: { kind: 'invite', error: formatError(error, 'That code didn’t work') } });
      return;
    }
    this.becomeReady(multisig);
  }

  // The account last used here, per key (another Telegram user on this phone has their own).
  private rememberedKey(): string {
    return `${LAST_ACCOUNT_KEY}:${(this.deps.signer.commitment ?? '').toLowerCase()}`;
  }

  private remembered(): string | undefined {
    return (this.deps.storage?.get(this.rememberedKey()) ?? this.deps.storage?.get(LAST_ACCOUNT_KEY))?.toLowerCase();
  }

  private async findOrCreate(multisigClient: M): Promise<Multisig> {
    // Known on this phone: load it straight away. The lookup is always
    // wallet-signed (not a session request), so skipping it makes reopening
    // signature-free. Not this key's account, or gone: look it up.
    const known = this.remembered();
    if (known) {
      try {
        return await this.deps.loadAccount(multisigClient, known, this.deps.signer, this.hooks);
      } catch (error) {
        console.warn('The account remembered here did not load; looking it up', error);
      }
    }
    const matches = await multisigClient.recoverByKey(this.deps.signer);
    if (matches.length > 0) {
      // A key normally has one account; an interrupted first start can leave
      // a second. Prefer the one last used here, else the latest updated.
      const remembered = known;
      const chosen = matches.find((m) => m.accountId.toLowerCase() === remembered)
        ?? [...matches].sort((a, b) => Date.parse(b.state.updatedAt) - Date.parse(a.state.updatedAt))[0];
      return this.deps.loadAccount(multisigClient, chosen.accountId, this.deps.signer, this.hooks);
    }
    this.update({ phase: { kind: 'creating' } });
    const multisig = await this.deps.createAccount(multisigClient, this.deps.signer, this.hooks);
    await multisig.registerOnGuardian();
    return multisig;
  }

  private exclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  /** Bring account, balances and incoming notes up to date. */
  refresh(): Promise<void> {
    return this.exclusive(() => this.syncAccount());
  }

  private async syncAccount(): Promise<void> {
    const { midenClient, multisig } = this;
    if (!midenClient || !multisig) return;
    try {
      await midenClient.sync();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await midenClient.sync();
    }
    try {
      await midenClient.notes.fetchPrivate();
    } catch (error) {
      console.warn('Could not fetch private notes; private deposits may show up on the next refresh.', error);
    }
    // The wallet's one token is the network's fee token (USDCX on testnet),
    // known only once a sync brought the node's protocol configuration.
    let token = this.snapshot.feeFaucetId;
    if (!token) {
      const feeFaucet = await midenClient.feeFaucetId();
      token = feeFaucet.toString().toLowerCase();
      feeFaucet.free?.();
      this.update({ feeFaucetId: token });
    }
    const isToken = (faucetId: string) => faucetId.toLowerCase() === token;
    try {
      await multisig.syncState();
    } catch (error) {
      // Right after an execute the local account is ahead of what Guardian has
      // seen on chain; the local state is the current one then.
      if (!/nonce is too low/i.test(formatError(error))) throw error;
    }
    // Only the wallet's token: notes in other tokens are never shown or
    // collected, and stay claimable should the wallet add tokens later.
    const incoming = (await multisig.getConsumableNotes())
      .filter((note) => note.assets.length > 0 && note.assets.every((asset) => isToken(asset.faucetId)));
    const balances = AccountInspector.fromAccount(multisig.account).vaultBalances
      .filter((b) => b.amount > 0n && isToken(b.faucetId));
    // History is a nicety: keep the last list if Guardian's feed fails.
    const history = await multisig.deltaHistory({ limit: 20 })
      .then((page) => toActivity(page.entries).filter((item) => isToken(item.faucetId)))
      .catch((error: unknown) => {
        console.warn('Could not load the account history', error);
        return this.snapshot.history;
      });
    if (this.multisig !== multisig) return;
    this.update({ incoming, balances, history, savedAt: null });
    this.saveView();
  }

  /** A private send's note travels to the recipient through the note transport, after it commits. */
  /** Resolves with the network fee it paid, when the new balance could be read (null otherwise). */
  async send(
    recipientId: string,
    faucetId: string,
    amount: bigint,
    { private: isPrivate = false } = {},
  ): Promise<{ fee: bigint | null }> {
    if (amount <= 0n) throw new Error('Enter an amount greater than zero.');
    if (isPrivate && !this.privateNotes) throw new Error('Private payments are not available.');
    const before = this.feeTokenBalance();
    await this.runTransaction(
      'send',
      (ms) => ms.createP2idProposal(recipientId, faucetId, amount, isPrivate ? { noteType: NoteType.Private } : undefined),
      isPrivate,
    );
    // The fee is paid in the fee token: whatever left it beyond the payment.
    const spent = before - this.feeTokenBalance();
    const fee = faucetId.toLowerCase() === this.snapshot.feeFaucetId ? spent - amount : spent;
    return { fee: spent > 0n && fee >= 0n ? fee : null };
  }

  private feeTokenBalance(): bigint {
    const token = this.snapshot.feeFaucetId;
    return this.snapshot.balances.find((b) => b.faucetId.toLowerCase() === token)?.amount ?? 0n;
  }

  async claimAll(): Promise<void> {
    const ids = this.snapshot.incoming.map((note) => note.id);
    if (ids.length === 0) return;
    await this.runTransaction('claim', (ms) => ms.createConsumeNotesProposal(ids), false, ids);
  }

  private async runTransaction(
    kind: WalletActivity['kind'],
    create: (ms: Multisig) => Promise<Proposal>,
    isPrivate = false,
    consumes: string[] = [],
  ): Promise<void> {
    const { midenClient, multisig } = this;
    if (!midenClient || !multisig) throw new Error('The wallet is not ready yet.');
    if (this.busy) throw new Error('Another transaction is still in progress.');
    this.busy = true;
    try {
      await this.exclusive(() => this.transact(midenClient, multisig, kind, create, isPrivate, consumes));
    } finally {
      this.busy = false;
    }
    // The money is already shown (from the local account, below); bring
    // history, Guardian's view and anything new up to date in the background.
    void this.refresh().catch((error) => console.warn('Refresh after the transaction failed', error));
  }

  /** Every queued refresh and transaction has finished. */
  settled(): Promise<void> {
    return this.queue.then(() => undefined);
  }

  private async checkDeliveries(multisig: Multisig, privateNotes: PrivateNotes): Promise<void> {
    const nonce = multisig.account.nonce().asInt();
    if (this.deliveryCheckedAt === nonce && !privateNotes.hasPending(multisig.accountId)) return;
    await privateNotes.ensureDelivered(multisig);
    this.deliveryCheckedAt = nonce;
  }

  /** Run one step of a transaction, reporting how long it took. */
  private async timed<T>(label: string, work: () => Promise<T>): Promise<T> {
    const started = performance.now();
    try {
      return await work();
    } finally {
      this.deps.trace?.(label, Math.round(performance.now() - started));
    }
  }

  private async transact(
    midenClient: C,
    multisig: Multisig,
    kind: WalletActivity['kind'],
    create: (ms: Multisig) => Promise<Proposal>,
    isPrivate: boolean,
    consumes: string[],
  ): Promise<void> {
    const privateNotes = this.privateNotes;
    const step = (s: ActivityStep) => this.update({ activity: { kind, step: s } });
    const label = kind === 'send' ? 'Send failed' : 'Claim failed';
    clearExecutionPushed(multisig.accountId);
    let proposal: Proposal | undefined;
    let executed = false;
    this.update({ notice: null });
    try {
      step('preparing');
      // An earlier private payment must reach its recipient before the account
      // moves on (privateSend.ts); this delivers it, or refuses.
      if (privateNotes) {
        await this.timed('check deliveries', () => this.checkDeliveries(multisig, privateNotes)).catch((error: unknown) => {
          throw new Error(`your last private payment hasn't reached its recipient yet (${formatError(error)}). Try again in a minute.`);
        });
      }
      // Building a proposal executes the transaction against foreign state (the
      // fee faucet) at the store's sync height, which the node prunes after
      // about 50 blocks: sync to the tip first.
      await this.timed('sync to tip', () => midenClient.syncChain());
      proposal = await this.timed('build proposal', () => create(multisig));
      step('signing');
      // signProposal re-verifies the proposal and returns it signed; read it
      // back from Guardian only when that copy is not ready yet.
      const signed = await this.timed('sign', () => multisig.signProposal(proposal!.id));
      const fresh = signed && isProposalActionable(signed)
        ? signed
        : (await this.timed('re-read proposals', () => multisig.syncProposals())).find((p) => p.id === proposal!.id);
      if (!fresh || !isProposalActionable(fresh)) {
        throw new Error(fresh?.verification.status === 'failed'
          ? `the proposal did not verify: ${fresh.verification.message}`
          : 'the proposal is not ready to execute.');
      }
      if (isPrivate) privateNotes!.record(multisig, fresh);
      step('proving');
      await this.timed('execute, prove, submit', () => multisig.executeProposal(proposal!.id));
      executed = true;
      let delivered = true;
      if (isPrivate) {
        step('delivering');
        await this.timed('deliver privately', () => privateNotes!.deliver(multisig, fresh)).catch((error: unknown) => {
          // Sent: the note is recorded and the next transaction (or start)
          // delivers it once it has committed.
          delivered = false;
          console.warn('Private delivery is not done yet', error);
          this.update({ notice: 'Sent privately. Delivery to the recipient finishes in a moment; keep the app open.' });
        });
      }
      step('syncing');
      await this.timed('show new balance', () => this.showLocalResult(multisig, consumes, delivered)).catch((error) => {
        console.warn('Reading the new balance failed', error);
        this.update({ notice: 'Done. The balance may take a moment to update.' });
      });
    } catch (error) {
      if (isPendingCandidateError(error)) {
        throw new Error(await this.recoverLock(multisig));
      }
      const message = describeExecutionError(error, label);
      // Never reached Guardian, so it cannot land: nothing to deliver.
      if (isPrivate && proposal && !executed && !executionWasPushed(multisig.accountId)) privateNotes?.forget(proposal);
      if (proposal && !executed && executionWasPushed(multisig.accountId)) {
        // Guardian accepted this execute's push before it failed, so the lock
        // is ours and the transaction can no longer land: release it now
        // instead of leaving the account locked until Guardian gives up.
        const outcome = await this.releaseLock(multisig, proposal.nonce);
        throw new Error(`${message} ${releaseNote(outcome)}`.trim());
      }
      throw new Error(message);
    } finally {
      clearExecutionPushed(multisig.accountId);
      this.update({ activity: null });
    }
  }

  /**
   * Right after an execute: the new balance from this device's copy of the
   * account (the execute applied it locally; no network), and the collected
   * notes off the list. The full refresh follows in the background.
   */
  private async showLocalResult(multisig: Multisig, consumes: string[], delivered: boolean): Promise<void> {
    const account = await multisig.getStoreAccount();
    const token = this.snapshot.feeFaucetId;
    const balances = AccountInspector.fromAccount(account).vaultBalances
      .filter((b) => b.amount > 0n && (!token || b.faucetId.toLowerCase() === token));
    const gone = new Set(consumes);
    if (this.multisig !== multisig) return;
    this.update({ balances, incoming: this.snapshot.incoming.filter((note) => !gone.has(note.id)) });
    this.saveView();
    // Our own transaction is the latest: its private notes (if any) are
    // delivered, so the next transaction need not look again.
    if (delivered) this.deliveryCheckedAt = account.nonce().asInt();
  }

  private async releaseLock(multisig: Multisig, nonce: number): Promise<ReleaseOutcome | 'failed'> {
    try {
      const outcome = await (this.deps.release ?? releasePendingCandidate)(multisig, nonce);
      await this.syncAccount().catch(() => undefined);
      return outcome;
    } catch (error) {
      console.warn('Could not release the account lock', error);
      return 'failed';
    }
  }

  /** Another execution holds the account's Guardian lock: release it once it is stale. */
  private async recoverLock(multisig: Multisig): Promise<string> {
    const proposals = await multisig.syncProposals().catch(() => multisig.listProposals());
    const lookup = await findLockedCandidate(multisig, proposals);
    if (lookup.kind === 'none') return 'A previous transaction just finished. Try again.';
    if (lookup.kind === 'unknown') {
      return 'A previous transaction is still pending. Guardian clears it within about 20 minutes; try again then.';
    }
    const wait = msUntilUnlockable(lookup.candidate);
    if (wait > 0) {
      return `A previous transaction is still being processed. Try again in ${Math.ceil(wait / 60_000)} min.`;
    }
    const outcome = await this.releaseLock(multisig, lookup.candidate.nonce);
    return outcome === 'landed'
      ? 'Your previous transaction went through. Check your balance before sending again.'
      : `${releaseNote(outcome)} Try again.`;
  }
}

function releaseNote(outcome: ReleaseOutcome | 'failed'): string {
  switch (outcome) {
    case 'abandoned':
      return 'Nothing was sent.';
    case 'landed':
      return 'It did go through after all.';
    case 'retained':
      return 'It may still go through: check your balance in a few minutes before trying again.';
    default:
      return 'The account is still locked for a few minutes.';
  }
}

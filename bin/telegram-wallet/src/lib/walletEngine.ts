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
import { emailChangeSteps, newPhoneSteps, recoveryStatus, recoverySteps, type AccountRules, type KeyStep, type RecoveryStatus, type SetupStep } from './recovery';

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
  /**
   * Invite-only network: a key with no account yet is asked for its invite
   * code before anything is created (no code, no account on Guardian).
   */
  inviteOnly?: boolean;
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
  /**
   * This phone's key (phoneKey.ts), when the phone has one: its commitment
   * (no scan) and a signer for it (a signature uses the key held for the
   * current action, else asks for a scan). Once recovery is on, payments
   * need it next to the Telegram key.
   */
  phoneKey?: { commitment(): string | null; signer(): Promise<Signer> };
  /** Waiting for Guardian to take the last transaction before the next (tests shorten it). */
  guardianCatchUp?: { timeoutMs: number; everyMs: number };
  /** Private sends: note delivery and the check before each transaction. */
  createPrivateNotes?(midenClient: C): PrivateNotes;
  /** Remembers the account this key last used, to prefer it if the key has several. */
  storage?: { get(key: string): string | null; set(key: string, value: string): void; remove?(key: string): void };
  /** Whose saved home view this is (see savedView.ts); defaults to the signing key, null for none. */
  viewKey?: string | null;
  /**
   * Prefix for what is remembered per network (viewScope.ts): set, the account
   * last used is looked up only under it, never another network's id.
   */
  storageScope?: string;
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
  /**
   * `recovery`: one of the setup transactions; `phone`: moving the wallet to
   * this phone; `email`: changing the recovery email (recovery.ts).
   */
  kind: 'send' | 'claim' | 'recovery' | 'phone' | 'email';
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
  /** Recovery on the account (recovery.ts), from its rules once loaded. */
  recovery: RecoveryStatus;
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
// Before the next setup transaction: how long to wait for Guardian to take the last one.
const GUARDIAN_CATCH_UP = { timeoutMs: 90_000, everyMs: 2_000 };
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
    recovery: { kind: 'unknown' },
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
  /**
   * The account as another key sees it (this phone's key, the recovery email
   * key), each with its own Guardian connection, for their signatures.
   */
  private cosigners = new Map<string, Multisig>();
  /** Waiting for the invite code before creating the account (invite-only network). */
  private inviteWaiter: ((code: string) => void) | null = null;
  /** The accepted invite code this start registers with. */
  private invitationCode: string | null = null;
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
    // Never the home screen of an account that is not registered yet (invite
    // pending): the next open would show it before asking for the code.
    if (this.snapshot.phase.kind !== 'ready' && this.multisig?.account.nonce().asInt() === 0n) return;
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
      const midenClient = this.midenClient ?? await this.timed('start: miden client', () => this.deps.startMidenClient());
      this.midenClient = midenClient;
      this.privateNotes ??= this.deps.createPrivateNotes?.(midenClient) ?? null;
      const multisigClient = this.deps.createMultisigClient(midenClient);
      this.update({ phase: { kind: 'finding' } });
      // Before the account loads: its reads then need no wallet signature.
      if (this.deps.startSession) {
        await this.timed('guardian session', () => this.deps.startSession!(multisigClient))
          .catch((error: unknown) => console.warn('No Guardian session; the wallet signs requests', error));
      }

      const multisig = this.multisig ?? await this.timed('start: find account', () => this.findOrCreate(multisigClient));
      this.multisig = multisig;
      this.deps.storage?.set(this.rememberedKey(), multisig.accountId);
      this.update({ accountId: multisig.accountId });

      // The account's note tag before the first sync: a sync without it moves
      // the client past notes that were sent to the account earlier.
      await this.timed('start: note tag', () => this.deps.registerNoteTag(midenClient, multisig.accountId));
      const unregistered = multisig.account.nonce().asInt() === 0n;
      // An invite-only network registers only with the user's code: an account
      // created before but never registered asks for it now, before the sync
      // (seconds sooner), and its saved home screen goes (it never had one).
      const needsCode = unregistered && !this.invitationCode && this.deps.needsInvitation
        ? await this.deps.needsInvitation(midenClient, multisig.accountId)
        : null;
      if (needsCode) {
        const key = this.viewKey();
        if (key) this.deps.storage?.remove?.(key);
        this.update({ phase: { kind: 'invite' }, balances: [], history: [], savedAt: null });
        return;
      }
      await this.refresh();
      // Registered with its code on an earlier open, never used since: the
      // node already allows it, and registering again would need a code the
      // wallet no longer has (invite-only).
      const alreadyAllowed = needsCode === false;
      if (unregistered && !alreadyAllowed) {
        // The node only accepts transactions from registered accounts. A new
        // account registers here (with the invite code it was created with,
        // on an invite-only network); one whose first start was interrupted
        // is registered again (idempotent). Whatever the network sends a new
        // account arrives as an ordinary incoming payment.
        const code = this.invitationCode;
        this.update({ phase: { kind: 'registering' } });
        try {
          await this.deps.registerOnNode(midenClient, multisig.accountId, code ?? undefined);
        } catch (error) {
          if (!code) throw error;
          // Taken in the meantime, or refused: ask again (the account stays).
          this.invitationCode = null;
          this.update({ phase: { kind: 'invite', error: formatError(error, 'That code didn’t work') } });
          return;
        }
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
    const { midenClient } = this;
    const trimmed = code.trim();
    if (!midenClient || this.snapshot.phase.kind !== 'invite') return;
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
    } catch (error) {
      this.update({ phase: { kind: 'invite', error: formatError(error, 'Couldn’t check the code') } });
      return;
    }
    // Asked before creating: the start goes on (create, then register with it).
    const waiter = this.inviteWaiter;
    if (waiter) {
      this.inviteWaiter = null;
      waiter(trimmed);
      return;
    }
    const { multisig } = this;
    if (!multisig) return;
    try {
      await this.deps.registerOnNode(midenClient, multisig.accountId, trimmed);
    } catch (error) {
      this.update({ phase: { kind: 'invite', error: formatError(error, 'That code didn’t work') } });
      return;
    }
    this.becomeReady(multisig);
    // It skipped the sync while waiting for the code: bring the balance in now.
    void this.refresh().catch((error) => console.warn('Refresh after registering failed', error));
  }

  // The account last used here, per key (another Telegram user on this phone has their own).
  private rememberedKey(): string {
    return `${LAST_ACCOUNT_KEY}:${this.deps.storageScope ?? ''}${(this.deps.signer.commitment ?? '').toLowerCase()}`;
  }

  private remembered(): string | undefined {
    const legacy = this.deps.storageScope ? null : this.deps.storage?.get(LAST_ACCOUNT_KEY);
    return (this.deps.storage?.get(this.rememberedKey()) ?? legacy)?.toLowerCase();
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
    // Invite-only: the code first, so no one without one gets an account.
    if (this.deps.inviteOnly && !this.invitationCode) {
      this.invitationCode = await new Promise<string>((resolve) => {
        this.inviteWaiter = resolve;
        this.update({ phase: { kind: 'invite' } });
      });
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
    // History is only Guardian's feed (no local store): fetched alongside the
    // sync instead of after it. A nicety: keep the last list if it fails.
    const historyPage = this.timed('sync: history', () => multisig.deltaHistory({ limit: 20 }))
      .then((page) => page, (error: unknown) => {
        console.warn('Could not load the account history', error);
        return null;
      });
    try {
      await this.timed('sync: node', () => midenClient.sync());
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await midenClient.sync();
    }
    try {
      await this.timed('sync: private notes', () => midenClient.notes.fetchPrivate());
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
      await this.timed('sync: guardian state', () => multisig.syncState());
    } catch (error) {
      // Right after an execute the local account is ahead of what Guardian has
      // seen on chain; the local state is the current one then.
      if (!/nonce is too low/i.test(formatError(error))) throw error;
    }
    this.updateRecovery(multisig);
    // Only the wallet's token: notes in other tokens are never shown or
    // collected, and stay claimable should the wallet add tokens later.
    const incoming = (await this.timed('sync: incoming notes', () => multisig.getConsumableNotes()))
      .filter((note) => note.assets.length > 0 && note.assets.every((asset) => isToken(asset.faucetId)));
    const balances = AccountInspector.fromAccount(multisig.account).vaultBalances
      .filter((b) => b.amount > 0n && isToken(b.faucetId));
    if (this.multisig !== multisig) return;
    // The balance and waiting payments as soon as they are known.
    this.update({ incoming, balances });
    const page = await historyPage;
    const history = page ? toActivity(page.entries).filter((item) => isToken(item.faucetId)) : this.snapshot.history;
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

  /** The Telegram key's commitment (the key this wallet signs in with). */
  telegramCommitment(): string {
    return this.deps.signer.commitment ?? '';
  }

  /** The account's signer key commitments as this device last read them. */
  accountSigners(): string[] {
    const signers = (this.multisig as Partial<Multisig> | null)?.signerCommitments;
    return Array.isArray(signers) ? [...signers] : [];
  }

  /** The account's rules as this device last read them (null before the first load). */
  private updateRecovery(multisig: Multisig): void {
    if (this.multisig !== multisig) return;
    const recovery = recoveryStatus(rulesOf(multisig), this.deps.phoneKey?.commitment() ?? null);
    if (JSON.stringify(recovery) !== JSON.stringify(this.snapshot.recovery)) this.update({ recovery });
  }

  /**
   * Turns recovery on (recovery.ts): runs the steps the account still needs,
   * one transaction each, signed by the Telegram key alone; Guardian takes
   * each before the next is built. Done only once the account's rules read
   * back as two of three. Interrupted, a later call picks up where it stopped.
   * `onStep(done, total)` before each transaction.
   */
  async setUpRecovery(keys: { phone: string; email: string }, onStep?: (done: number, total: number) => void): Promise<void> {
    const { midenClient, multisig } = this;
    if (!midenClient || !multisig) throw new Error('The wallet is not ready yet.');
    if (this.busy) throw new Error('Another transaction is still in progress.');
    this.busy = true;
    try {
      await this.exclusive(async () => {
        let total = 0;
        for (let done = 0; ; done++) {
          await this.timed('wait for guardian', () => this.untilGuardianCaughtUp(multisig));
          const steps = recoverySteps(rulesOf(multisig) ?? NO_RULES, keys);
          const next = steps[0];
          if (!next) break;
          total = Math.max(total, done + steps.length);
          // A step that never shows up in the account's rules would repeat forever.
          if (done >= 4) throw new Error('Recovery could not be turned on. Try again in a minute.');
          onStep?.(done, total);
          await this.transact(midenClient, multisig, 'recovery', (ms) => buildSetupStep(ms, next), false, []);
        }
        this.updateRecovery(multisig);
        if (this.snapshot.recovery.kind !== 'on') throw new Error('Recovery is not on yet. Try again in a minute.');
      });
    } finally {
      this.busy = false;
    }
    void this.refresh().catch((error) => console.warn('Refresh after setting up recovery failed', error));
  }

  /**
   * Recovery on, a new phone (recovery.ts): adds this phone's key and removes
   * the other phones', each a transaction the Telegram key and the recovery
   * email key sign. Done once the account lists this phone and no other.
   */
  moveToThisPhone(keys: { phone: string; email: Signer }, onStep?: (done: number, total: number) => void): Promise<void> {
    const telegram = this.deps.signer.commitment ?? '';
    return this.changeKeys('phone', {
      check: (rules) => {
        if (!rules.signers.some((s) => s.toLowerCase() === keys.email.commitment.toLowerCase())) {
          throw new Error('That isn’t the recovery email of this wallet. Use the one you set it up with.');
        }
      },
      steps: (rules) => newPhoneSteps(rules, { telegram, email: keys.email.commitment, phone: keys.phone }),
      cosigner: async () => keys.email,
    }, onStep);
  }

  /**
   * Recovery on, from a phone whose key is on the account: a new recovery
   * email key replaces the old one (added, then the old one removed). This
   * phone's key and the Telegram key sign; the old email is not needed.
   */
  changeRecoveryEmail(email: string, onStep?: (done: number, total: number) => void): Promise<void> {
    const telegram = this.deps.signer.commitment ?? '';
    const phone = this.deps.phoneKey?.commitment() ?? '';
    return this.changeKeys('email', {
      check: (rules) => {
        if (!phone || !rules.signers.some((s) => s.toLowerCase() === phone.toLowerCase())) {
          throw new Error('Change the recovery email from the phone you pay with.');
        }
        if (rules.signers.some((s) => s.toLowerCase() === email.toLowerCase()) && rules.signers.length === 3) {
          throw new Error('That’s already your recovery email.');
        }
      },
      steps: (rules) => emailChangeSteps(rules, { telegram, phone, email }),
    }, onStep);
  }

  /**
   * Key changes once recovery is on: each step one transaction, two keys
   * signing (the Telegram key, then `cosigner`, by default this phone's);
   * Guardian takes each before the next is built. Resumes from the rules.
   */
  private async changeKeys(
    kind: 'phone' | 'email',
    plan: { check(rules: AccountRules): void; steps(rules: AccountRules): KeyStep[]; cosigner?: () => Promise<Signer> },
    onStep?: (done: number, total: number) => void,
  ): Promise<void> {
    const { midenClient, multisig } = this;
    if (!midenClient || !multisig) throw new Error('The wallet is not ready yet.');
    if (this.busy) throw new Error('Another transaction is still in progress.');
    this.busy = true;
    try {
      await this.exclusive(async () => {
        await this.timed('wait for guardian', () => this.untilGuardianCaughtUp(multisig));
        plan.check(rulesOf(multisig) ?? NO_RULES);
        let total = 0;
        for (let done = 0; ; done++) {
          if (done > 0) await this.timed('wait for guardian', () => this.untilGuardianCaughtUp(multisig));
          const steps = plan.steps(rulesOf(multisig) ?? NO_RULES);
          const next = steps[0];
          if (!next) break;
          total = Math.max(total, done + steps.length);
          // A step that never shows up in the account's rules would repeat forever.
          if (done >= 6) throw new Error('The change could not be finished. Try again in a minute.');
          onStep?.(done, total);
          await this.transact(midenClient, multisig, kind, (ms) => buildKeyStep(ms, next), false, [], plan.cosigner);
        }
        this.updateRecovery(multisig);
      });
    } finally {
      this.busy = false;
    }
    void this.refresh().catch((error) => console.warn('Refresh after the key change failed', error));
  }

  /** Until Guardian's canonical nonce reaches this device's (bounded; then the push decides). */
  private async untilGuardianCaughtUp(multisig: Multisig): Promise<void> {
    const { timeoutMs, everyMs } = this.deps.guardianCatchUp ?? GUARDIAN_CATCH_UP;
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const result = await multisig.syncState().catch(() => null) as { source?: string; localNonce?: bigint; guardianNonce?: bigint } | null;
      const behind = result?.source === 'local' && BigInt(result.guardianNonce ?? 0) < BigInt(result.localNonce ?? 0);
      if (!behind || Date.now() >= deadline) return;
      await new Promise((resolve) => setTimeout(resolve, everyMs));
    }
  }

  /**
   * A second signature: by default this phone's key (a payment once recovery
   * is on), else the given key, through the account loaded with that key (its
   * own Guardian connection: a shared one signs as whichever key loaded
   * last). Returns the proposal as the Telegram key's copy sees it afterwards.
   */
  private async cosign(multisig: Multisig, proposalId: string, cosigner?: () => Promise<Signer>): Promise<Proposal | undefined> {
    const { midenClient } = this;
    const phoneKey = this.deps.phoneKey;
    if (!cosigner && !phoneKey?.commitment()) {
      throw new Error('Payments from this wallet need this phone’s Face ID key, and this phone doesn’t have it.');
    }
    if (!midenClient) throw new Error('The wallet is not ready yet.');
    const signer = await (cosigner ?? (() => phoneKey!.signer()))();
    const id = `${multisig.accountId}:${(signer.commitment ?? '').toLowerCase()}`;
    let second = this.cosigners.get(id);
    if (!second) {
      second = await this.deps.loadAccount(this.deps.createMultisigClient(midenClient), multisig.accountId, signer, this.hooks);
      this.cosigners.set(id, second);
    }
    await second.syncState().catch((error: unknown) => {
      if (!/nonce is too low/i.test(formatError(error))) throw error;
    });
    await second.syncProposals();
    await second.signProposal(proposalId);
    return (await multisig.syncProposals()).find((p) => p.id === proposalId);
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
    /** The key that signs second, when the proposal needs two (default: this phone's). */
    cosigner?: () => Promise<Signer>,
  ): Promise<void> {
    const privateNotes = this.privateNotes;
    const step = (s: ActivityStep) => this.update({ activity: { kind, step: s } });
    const label = kind === 'send' ? 'Send failed' : kind === 'claim' ? 'Claim failed' : kind === 'recovery' ? 'Recovery could not be turned on' : kind === 'phone' ? 'This phone could not be added' : 'The recovery email could not be changed';
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
      // Recovery on: a payment needs this phone's key too.
      const second = signed && needsAnotherSignature(signed)
        ? await this.timed('second signature', () => this.cosign(multisig, proposal!.id, cosigner))
        : undefined;
      const fresh = [second, signed].find((p) => p && isProposalActionable(p))
        ?? (await this.timed('re-read proposals', () => multisig.syncProposals())).find((p) => p.id === proposal!.id);
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

const NO_RULES: AccountRules = { signers: [], threshold: 1, overrides: {} };

/** The account's rules from its multisig configuration (null while unknown). */
function rulesOf(multisig: Multisig): AccountRules | null {
  const { signerCommitments, threshold, procedureThresholds } = multisig as Partial<Multisig>;
  if (!Array.isArray(signerCommitments) || typeof threshold !== 'number') return null;
  return { signers: signerCommitments, threshold, overrides: Object.fromEntries(procedureThresholds ?? []) };
}

/** Signed, verified and still short of the keys it needs. */
function needsAnotherSignature(proposal: Proposal): boolean {
  return proposal.status === 'pending' && proposal.verification.status === 'verified';
}

function buildSetupStep(multisig: Multisig, step: SetupStep): Promise<Proposal> {
  switch (step.kind) {
    case 'collect-with-one':
      return multisig.createUpdateProcedureThresholdProposal('receive_asset', 1);
    case 'add-key':
      return multisig.createAddSignerProposal(step.commitment, { newThreshold: step.threshold });
    case 'require-two':
      return multisig.createChangeThresholdProposal(2);
  }
}

function buildKeyStep(multisig: Multisig, step: KeyStep): Promise<Proposal> {
  return step.kind === 'add'
    ? multisig.createAddSignerProposal(step.commitment, { newThreshold: 2 })
    : multisig.createRemoveSignerProposal(step.commitment, { newThreshold: 2 });
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

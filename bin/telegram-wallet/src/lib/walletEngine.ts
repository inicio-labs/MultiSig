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
  registerOnNode(midenClient: C, accountId: string): Promise<void>;
  registerNoteTag(midenClient: C, accountId: string): Promise<void>;
  /** Private sends: note delivery and the check before each transaction. */
  createPrivateNotes?(midenClient: C): PrivateNotes;
  /** Remembers the account this key last used, to prefer it if the key has several. */
  storage?: { get(key: string): string | null; set(key: string, value: string): void };
  release?: typeof releasePendingCandidate;
}

export type WalletPhase =
  | { kind: 'starting' }
  | { kind: 'finding' }
  | { kind: 'creating' }
  /** Registering the never-used account with the node. */
  | { kind: 'registering' }
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
}

/**
 * Received and sent assets per transaction, newest first (Guardian's order).
 * Output notes without a recipient are the transaction fee, not a payment.
 */
export function toActivity(entries: HistoryEntry[]): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const entry of entries) {
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
  }
  return items;
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
}

const LAST_ACCOUNT_KEY = 'miden-tg-wallet:last-account';

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
  };
  private readonly listeners = new Set<() => void>();
  private midenClient: C | null = null;
  private privateNotes: PrivateNotes | null = null;
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

  constructor(private readonly deps: WalletEngineDeps<C, M>) {}

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
    try {
      this.update({ phase: { kind: 'starting' }, notice: null });
      const midenClient = this.midenClient ?? await this.deps.startMidenClient();
      this.midenClient = midenClient;
      this.privateNotes ??= this.deps.createPrivateNotes?.(midenClient) ?? null;
      const multisigClient = this.deps.createMultisigClient(midenClient);
      this.update({ phase: { kind: 'finding' } });

      const multisig = this.multisig ?? await this.findOrCreate(multisigClient);
      this.multisig = multisig;
      this.deps.storage?.set(LAST_ACCOUNT_KEY, multisig.accountId);
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
        this.update({ phase: { kind: 'registering' } });
        await this.deps.registerOnNode(midenClient, multisig.accountId);
      }
      this.update({ phase: { kind: 'ready' } });
      // A private payment whose delivery the app did not finish (closed meanwhile).
      const privateNotes = this.privateNotes;
      if (privateNotes) {
        void this.exclusive(() => privateNotes.ensureDelivered(multisig))
          .catch((error) => console.warn('An earlier private payment is not delivered yet', error));
      }
    } catch (error) {
      const during = START_STEP[this.snapshot.phase.kind] ?? 'starting';
      this.update({ phase: { kind: 'error', message: formatError(error, `The wallet could not start (while ${during})`) } });
    }
  }

  private async findOrCreate(multisigClient: M): Promise<Multisig> {
    const matches = await multisigClient.recoverByKey(this.deps.signer);
    if (matches.length > 0) {
      // A key normally has one account; an interrupted first start can leave
      // a second. Prefer the one last used here, else the latest updated.
      const remembered = this.deps.storage?.get(LAST_ACCOUNT_KEY)?.toLowerCase();
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
    if (this.multisig === multisig) this.update({ incoming, balances, history });
  }

  /** A private send's note travels to the recipient through the note transport, after it commits. */
  async send(recipientId: string, faucetId: string, amount: bigint, { private: isPrivate = false } = {}): Promise<void> {
    if (amount <= 0n) throw new Error('Enter an amount greater than zero.');
    if (isPrivate && !this.privateNotes) throw new Error('Private payments are not available.');
    await this.runTransaction(
      'send',
      (ms) => ms.createP2idProposal(recipientId, faucetId, amount, isPrivate ? { noteType: NoteType.Private } : undefined),
      isPrivate,
    );
  }

  async claimAll(): Promise<void> {
    const ids = this.snapshot.incoming.map((note) => note.id);
    if (ids.length === 0) return;
    await this.runTransaction('claim', (ms) => ms.createConsumeNotesProposal(ids));
  }

  private async runTransaction(
    kind: WalletActivity['kind'],
    create: (ms: Multisig) => Promise<Proposal>,
    isPrivate = false,
  ): Promise<void> {
    const { midenClient, multisig } = this;
    if (!midenClient || !multisig) throw new Error('The wallet is not ready yet.');
    if (this.busy) throw new Error('Another transaction is still in progress.');
    this.busy = true;
    try {
      await this.exclusive(() => this.transact(midenClient, multisig, kind, create, isPrivate));
    } finally {
      this.busy = false;
    }
  }

  private async transact(
    midenClient: C,
    multisig: Multisig,
    kind: WalletActivity['kind'],
    create: (ms: Multisig) => Promise<Proposal>,
    isPrivate: boolean,
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
        await privateNotes.ensureDelivered(multisig).catch((error: unknown) => {
          throw new Error(`your last private payment hasn't reached its recipient yet (${formatError(error)}). Try again in a minute.`);
        });
      }
      // Building a proposal executes the transaction against foreign state (the
      // fee faucet) at the store's sync height, which the node prunes after
      // about 50 blocks: sync to the tip first.
      await midenClient.syncChain();
      proposal = await create(multisig);
      step('signing');
      await multisig.signProposal(proposal.id);
      const fresh = (await multisig.syncProposals()).find((p) => p.id === proposal!.id);
      if (!fresh || !isProposalActionable(fresh)) {
        throw new Error(fresh?.verification.status === 'failed'
          ? `the proposal did not verify: ${fresh.verification.message}`
          : 'the proposal is not ready to execute.');
      }
      if (isPrivate) privateNotes!.record(multisig, fresh);
      step('proving');
      await multisig.executeProposal(proposal.id);
      executed = true;
      if (isPrivate) {
        step('delivering');
        await privateNotes!.deliver(multisig, fresh).catch((error: unknown) => {
          // Sent: the note is recorded and the next transaction (or start)
          // delivers it once it has committed.
          console.warn('Private delivery is not done yet', error);
          this.update({ notice: 'Sent privately. Delivery to the recipient finishes in a moment; keep the app open.' });
        });
      }
      step('syncing');
      await this.syncAccount().catch((error) => {
        console.warn('Refresh after the transaction failed', error);
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

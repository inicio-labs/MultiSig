import { describe, expect, it, vi } from 'vitest';
import type { Signer } from '@openzeppelin/miden-multisig-client';
import { markExecutionPushed } from '../src/lib/pendingCandidate';
import type { PrivateNotes } from '../src/lib/privateSend';
import { toActivity, WalletEngine, type WalletEngineDeps, type WalletMidenClient, type WalletMultisigClient } from '../src/lib/walletEngine';

// Balances come from the account's vault; the fakes carry them directly.
vi.mock('@openzeppelin/miden-multisig-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@openzeppelin/miden-multisig-client')>();
  return {
    ...actual,
    AccountInspector: { fromAccount: (account: { balances: unknown }) => ({ vaultBalances: account.balances }) },
  };
});

const FEE = '0xfee0000000000000000000000000ff';
const TOKEN = '0x70ce000000000000000000000000aa';
const RECIPIENT = '0x1111111111111111111111111111ab';
const funding = { id: '0xnote-funding', assets: [{ faucetId: FEE, amount: 1_000_000n }] };

interface FakeOptions {
  accountId?: string;
  nonce?: bigint;
  notes?: Array<typeof funding>;
  failOn?: Partial<Record<string, Error>>;
  pushBeforeFailing?: boolean;
}

function fakeMultisig(log: string[], opts: FakeOptions = {}) {
  const accountId = opts.accountId ?? '0xacc0000000000000000000000000aa';
  let nonce = opts.nonce ?? 0n;
  let notes = opts.notes ?? [];
  let proposalNonce = 0;
  const fail = (method: string) => {
    const error = opts.failOn?.[method];
    if (!error) return;
    if (method === 'executeProposal' && opts.pushBeforeFailing) markExecutionPushed(accountId);
    throw error;
  };
  const ms = {
    accountId,
    account: { nonce: () => ({ asInt: () => nonce }), balances: [{ faucetId: FEE, amount: 5n }, { faucetId: TOKEN, amount: 0n }] },
    guardian: {
      getDelta: async () => ({ status: { status: 'candidate', timestamp: new Date(Date.now() - 10 * 60_000).toISOString() } }),
    },
    registerOnGuardian: async () => { log.push('registerOnGuardian'); },
    syncState: async () => { log.push('syncState'); fail('syncState'); },
    getConsumableNotes: async () => notes,
    createConsumeNotesProposal: async (ids: string[]) => {
      log.push(`consume:${ids.join(',')}`);
      fail('createConsumeNotesProposal');
      return { id: 'p-consume', nonce: ++proposalNonce };
    },
    createP2idProposal: async (to: string, faucet: string, amount: bigint, options?: { noteType?: unknown }) => {
      log.push(`p2id:${to}:${faucet}:${amount}${options?.noteType !== undefined ? ':private' : ''}`);
      fail('createP2idProposal');
      return { id: 'p-send', nonce: ++proposalNonce };
    },
    signProposal: async (id: string) => { log.push(`sign:${id}`); },
    syncProposals: async () => [
      { id: 'p-consume', nonce: proposalNonce, status: 'ready', verification: { status: 'verified' } },
      { id: 'p-send', nonce: proposalNonce, status: 'ready', verification: { status: 'verified' } },
    ],
    listProposals: () => [],
    executeProposal: async (id: string) => {
      log.push(`execute:${id}`);
      fail('executeProposal');
      nonce += 1n;
      notes = [];
    },
    deltaHistory: async () => ({ entries: [] }),
    setNotes: (next: Array<typeof funding>) => { notes = next; },
  };
  return ms;
}

function setup(opts: FakeOptions & {
  existing?: Array<{ accountId: string; updatedAt: string }>;
  remembered?: string;
  privateNotes?: Partial<PrivateNotes>;
} = {}) {
  const log: string[] = [];
  const ms = fakeMultisig(log, opts);
  const midenClient: WalletMidenClient = {
    sync: async () => { log.push('sync'); },
    syncChain: async () => { log.push('syncChain'); },
    feeFaucetId: async () => ({ toString: () => FEE }),
    notes: { fetchPrivate: async () => undefined },
  };
  const store = new Map<string, string>(opts.remembered ? [['miden-tg-wallet:last-account', opts.remembered]] : []);
  const release = vi.fn(async () => 'abandoned' as const);
  const deps: WalletEngineDeps<WalletMidenClient, WalletMultisigClient> = {
    signer: { commitment: '0x' + '0c'.repeat(32), scheme: 'ecdsa' } as unknown as Signer,
    startMidenClient: async () => { log.push('startMidenClient'); return midenClient; },
    createMultisigClient: () => ({
      recoverByKey: async () => (opts.existing ?? []).map(({ accountId, updatedAt }) => ({ accountId, state: { updatedAt } })),
    }),
    createAccount: async () => { log.push('createAccount'); return ms as never; },
    loadAccount: async (_c, accountId) => { log.push(`load:${accountId}`); return ms as never; },
    registerOnNode: async () => { log.push('registerOnNode'); },
    registerNoteTag: async () => { log.push('registerNoteTag'); },
    storage: { get: (k) => store.get(k) ?? null, set: (k, v) => { store.set(k, v); } },
    createPrivateNotes: () => ({
      ensureDelivered: async () => { log.push('ensureDelivered'); },
      record: (_ms, proposal) => { log.push(`record:${proposal.id}`); },
      deliver: async (_ms, proposal) => { log.push(`deliver:${proposal.id}`); },
      forget: (proposal) => { log.push(`forget:${proposal.id}`); },
      ...opts.privateNotes,
    }),
    release,
  };
  const engine = new WalletEngine(deps);
  const phases: string[] = [];
  engine.subscribe(() => {
    const kind = engine.getSnapshot().phase.kind;
    if (phases.at(-1) !== kind) phases.push(kind);
  });
  return { engine, log, ms, phases, release, store };
}

describe('WalletEngine.start', () => {
  it('creates a new account, registers it on Guardian and the node, and is ready without transacting', async () => {
    const { engine, log, phases, store } = setup();
    await engine.start();

    expect(engine.getSnapshot().phase).toEqual({ kind: 'ready' });
    expect(phases).toEqual(['starting', 'finding', 'creating', 'registering', 'ready']);
    expect(log).toEqual([
      'startMidenClient', 'createAccount', 'registerOnGuardian', 'registerNoteTag', 'sync', 'syncState', 'registerOnNode',
      'ensureDelivered', // in the background: a private payment an earlier session left undelivered
    ]);
    expect(store.get('miden-tg-wallet:last-account')).toBe(engine.getSnapshot().accountId);
    expect(engine.getSnapshot().balances).toEqual([{ faucetId: FEE, amount: 5n }]);
  });

  it('leaves what the network sends a new account as an ordinary incoming payment', async () => {
    const { engine, log } = setup({ notes: [funding] });
    await engine.start();
    expect(engine.getSnapshot().incoming).toEqual([funding]);
    expect(log.some((entry) => entry.startsWith('consume:'))).toBe(false);
  });

  it('shares one start between concurrent calls, so one key never creates two accounts', async () => {
    const { engine, log } = setup();
    await Promise.all([engine.start(), engine.start()]);
    expect(log.filter((entry) => entry === 'createAccount')).toHaveLength(1);
    expect(engine.getSnapshot().phase).toEqual({ kind: 'ready' });
  });

  it('loads the existing account of a returning user without registering or transacting', async () => {
    const { engine, log, phases } = setup({ nonce: 3n, existing: [{ accountId: '0xold', updatedAt: '2026-10-01T00:00:00Z' }] });
    await engine.start();
    expect(phases).toEqual(['starting', 'finding', 'ready']);
    expect(log).toEqual(['startMidenClient', 'load:0xold', 'registerNoteTag', 'sync', 'syncState', 'ensureDelivered']);
  });

  it('registers a never-used existing account again (its first start may have been interrupted)', async () => {
    const { engine, log } = setup({ nonce: 0n, existing: [{ accountId: '0xold', updatedAt: '2026-10-01T00:00:00Z' }] });
    await engine.start();
    expect(log).toContain('registerOnNode');
    expect(engine.getSnapshot().phase).toEqual({ kind: 'ready' });
  });

  it('prefers the account last used on this device, else the latest updated one', async () => {
    const existing = [
      { accountId: '0xA', updatedAt: '2026-10-01T00:00:00Z' },
      { accountId: '0xB', updatedAt: '2026-10-05T00:00:00Z' },
    ];
    const latest = setup({ nonce: 1n, existing });
    await latest.engine.start();
    expect(latest.log).toContain('load:0xB');

    const remembered = setup({ nonce: 1n, existing, remembered: '0xa' });
    await remembered.engine.start();
    expect(remembered.log).toContain('load:0xA');
  });

  it('reports a failed start, and a retry resumes the same account', async () => {
    const { engine, log, ms } = setup();
    const register = vi.fn().mockRejectedValueOnce(new Error('node unavailable')).mockResolvedValue(undefined);
    (engine as unknown as { deps: { registerOnNode: typeof register } }).deps.registerOnNode = register;
    await engine.start();
    expect(engine.getSnapshot().phase).toMatchObject({ kind: 'error', message: expect.stringContaining('node unavailable') });

    await engine.start();
    expect(engine.getSnapshot().phase).toEqual({ kind: 'ready' });
    expect(log.filter((entry) => entry === 'createAccount')).toHaveLength(1);
    expect(log.filter((entry) => entry === 'startMidenClient')).toHaveLength(1);
    expect(ms.accountId).toBe(engine.getSnapshot().accountId);
  });
});

describe('WalletEngine transactions', () => {
  async function ready(opts: Parameters<typeof setup>[0] = {}) {
    const ctx = setup({ nonce: 1n, existing: [{ accountId: '0xacc', updatedAt: '2026-10-01T00:00:00Z' }], ...opts });
    await ctx.engine.start();
    await ctx.engine.refresh(); // after the start's background delivery check
    ctx.log.length = 0;
    return ctx;
  }

  it('sends in one call: sync to tip, create, sign, execute, refresh', async () => {
    const { engine, log } = await ready();
    const steps: string[] = [];
    engine.subscribe(() => {
      const step = engine.getSnapshot().activity?.step;
      if (step && steps.at(-1) !== step) steps.push(step);
    });
    await engine.send(RECIPIENT, TOKEN, 25n);
    expect(log).toEqual(['ensureDelivered', 'syncChain', `p2id:${RECIPIENT}:${TOKEN}:25`, 'sign:p-send', 'execute:p-send', 'sync', 'syncState']);
    expect(steps).toEqual(['preparing', 'signing', 'proving', 'syncing']);
    expect(engine.getSnapshot().activity).toBeNull();
  });

  it('releases the Guardian lock when an execute fails after Guardian accepted it', async () => {
    const { engine, release } = await ready({ failOn: { executeProposal: new Error('failed to prove transaction') }, pushBeforeFailing: true });
    await expect(engine.send(RECIPIENT, TOKEN, 1n)).rejects.toThrow(/prover did not respond.*Nothing was sent\./);
    expect(release).toHaveBeenCalledWith(expect.anything(), 1);
  });

  it('does not touch the lock when the transaction failed before reaching Guardian', async () => {
    const { engine, release } = await ready({ failOn: { createP2idProposal: new Error('insufficient balance') } });
    await expect(engine.send(RECIPIENT, TOKEN, 1n)).rejects.toThrow('Send failed: insufficient balance.');
    expect(release).not.toHaveBeenCalled();
  });

  it('releases a stale lock left by an earlier execution and asks to try again', async () => {
    const { engine, release } = await ready({ failOn: { createP2idProposal: new Error('ConflictPendingDelta') } });
    await expect(engine.send(RECIPIENT, TOKEN, 1n)).rejects.toThrow('Nothing was sent. Try again.');
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('treats a refresh failure after a successful execute as success', async () => {
    const { engine, ms, release } = await ready();
    ms.syncState = async () => { throw new Error('guardian unavailable'); };
    await engine.send(RECIPIENT, TOKEN, 1n);
    expect(engine.getSnapshot().notice).toMatch(/balance may take a moment/);
    expect(release).not.toHaveBeenCalled();
  });

  it('runs one transaction at a time', async () => {
    const { engine } = await ready();
    const first = engine.send(RECIPIENT, TOKEN, 1n);
    await expect(engine.claimAll()).resolves.toBeUndefined(); // nothing to claim: no-op
    await expect(engine.send(RECIPIENT, TOKEN, 2n)).rejects.toThrow('still in progress');
    await first;
  });

  it('queues a refresh behind a running transaction instead of overlapping its Guardian requests', async () => {
    const { engine, log } = await ready();
    const sending = engine.send(RECIPIENT, TOKEN, 1n);
    const refreshing = engine.refresh();
    await Promise.all([sending, refreshing]);
    const executeAt = log.indexOf('execute:p-send');
    expect(log.lastIndexOf('syncState')).toBeGreaterThan(executeAt);
    expect(log.slice(0, executeAt)).not.toContain('syncState');
  });

  it('sends privately: records the note before executing and delivers it after', async () => {
    const { engine, log } = await ready();
    const steps: string[] = [];
    engine.subscribe(() => {
      const step = engine.getSnapshot().activity?.step;
      if (step && steps.at(-1) !== step) steps.push(step);
    });
    await engine.send(RECIPIENT, TOKEN, 7n, { private: true });
    expect(log).toEqual([
      'ensureDelivered', 'syncChain', `p2id:${RECIPIENT}:${TOKEN}:7:private`, 'sign:p-send', 'record:p-send',
      'execute:p-send', 'deliver:p-send', 'sync', 'syncState',
    ]);
    expect(steps).toEqual(['preparing', 'signing', 'proving', 'delivering', 'syncing']);
  });

  it('refuses any transaction while an earlier private payment is undelivered', async () => {
    const { engine, log } = await ready({
      privateNotes: { ensureDelivered: async () => { throw new Error('not on-chain yet'); } },
    });
    await expect(engine.send(RECIPIENT, TOKEN, 1n)).rejects.toThrow(/last private payment hasn't reached its recipient/);
    expect(log.some((entry) => entry.startsWith('p2id:'))).toBe(false);
  });

  it('counts a private send whose delivery is still pending as sent', async () => {
    const { engine, release } = await ready({
      privateNotes: { deliver: async () => { throw new Error('not committed yet'); } },
    });
    await engine.send(RECIPIENT, TOKEN, 1n, { private: true });
    expect(engine.getSnapshot().notice).toMatch(/Sent privately/);
    expect(release).not.toHaveBeenCalled();
  });

  it('forgets the note of a private send that never reached Guardian', async () => {
    const { engine, log } = await ready({ failOn: { executeProposal: new Error('insufficient balance') } });
    await expect(engine.send(RECIPIENT, TOKEN, 1n, { private: true })).rejects.toThrow('insufficient balance');
    expect(log).toContain('forget:p-send');
  });

  it('refuses a zero amount', async () => {
    const { engine } = await ready();
    await expect(engine.send(RECIPIENT, TOKEN, 0n)).rejects.toThrow('greater than zero');
  });
});

describe('toActivity', () => {
  const note = (noteId: string, amount: string, extra: object = {}) => ({
    noteId, tag: 'p2id' as const, noteType: 'public' as const, assets: [{ assetId: FEE, kind: 'fungible' as const, amount }], ...extra,
  });
  // Guardian's `nonce` here is a server sequence (e.g. 1791637467838), not the account nonce.
  const fee = note('fee', '126', { tag: 'custom' });
  const entries = [
    { nonce: 1791637467838, status: 'canonical' as const, timestamp: 't3', inputNotes: [], outputNotes: [note('n3', '10', { recipient: RECIPIENT }), fee], decodeWarnings: [] },
    { nonce: 1791637304354, status: 'canonical' as const, timestamp: 't2', inputNotes: [note('n2', '5', { sender: RECIPIENT })], outputNotes: [fee], decodeWarnings: [] },
  ];

  it('lists the payments of each transaction, without its fee note', () => {
    expect(toActivity(entries).map(({ direction, amount, counterparty }) => ({ direction, amount, counterparty }))).toEqual([
      { direction: 'out', amount: 10n, counterparty: RECIPIENT },
      { direction: 'in', amount: 5n, counterparty: RECIPIENT },
    ]);
  });
});

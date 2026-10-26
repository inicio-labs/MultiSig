import { afterEach, describe, expect, it, vi } from 'vitest';
import { GuardianSessionsUnsupportedError, SessionGrantDeclinedError } from '@openzeppelin/miden-multisig-client';
import { GuardianHttpError } from '@openzeppelin/guardian-client';
import {
  GuardianSessionManager,
  retryIfSessionDied,
  grantDialogRows,
  sessionLengthText,
  untilText,
  walletUsesSessions,
  type GuardianSessionState,
} from '../../src/lib/guardianSession';

// Fakes for the multisig client's session functions and a Guardian client.
type Ended = (reason: string, session: unknown) => void;
const session = (key: string, expiresAt = Math.floor(Date.now() / 1000) + 28_740) =>
  ({ storeId: `guardian:${key}`, publicKey: `0x02${key}`, expiresAt }) as never;
function guardian(name = 'g') {
  let current: unknown = null;
  return {
    name,
    getSession: () => current,
    setSession: vi.fn((s: unknown) => { current = s; }),
    revokeSession: vi.fn(async () => true),
  };
}
const signer = (requestAuthFormat?: 'eip712') => ({ commitment: '0xabc', scheme: 'ecdsa', requestAuthFormat }) as never;

function manager(options: { stored?: unknown; start?: () => Promise<unknown> } = {}) {
  const log: string[] = [];
  const states: GuardianSessionState[] = [];
  const ended: Ended[] = [];
  const store = {
    load: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(async (id: string) => { log.push(`remove ${id}`); }),
  };
  const deps = {
    confirm: vi.fn(async () => true),
    cancelConfirm: vi.fn(() => { log.push('cancel confirm'); }),
    onState: (state: GuardianSessionState) => { states.push(state); },
    store: () => store,
    resume: vi.fn(async (_g: unknown, _s: unknown, _st: unknown, o?: { onEnded?: Ended }) => {
      if (o?.onEnded) ended.push(o.onEnded);
      return (options.stored ?? null) as never;
    }),
    start: vi.fn(async (_g: unknown, _s: unknown, o?: { onEnded?: Ended }) => {
      if (o?.onEnded) ended.push(o.onEnded);
      return ((await options.start?.()) ?? session('new')) as never;
    }),
  };
  const sessions = new GuardianSessionManager(deps as never);
  return { sessions, deps, store, states, ended, log };
}

afterEach(() => vi.useRealTimers());

describe('Guardian sessions: which wallets', () => {
  it('only external wallets use sessions: local keys never prompt', () => {
    expect(walletUsesSessions('local')).toBe(false);
    for (const source of ['ledger', 'para', 'miden-wallet'] as const) expect(walletUsesSessions(source)).toBe(true);
  });
});

describe('GuardianSessionManager', () => {
  it('resumes the stored session without asking the wallet', async () => {
    const { sessions, deps, states } = manager({ stored: session('kept') });
    await sessions.setWallet('ledger|0xabc|https://g');
    const g = guardian();
    await sessions.ensure(g as never, signer());
    expect(deps.start).not.toHaveBeenCalled();
    expect(states.at(-1)).toMatchObject({ phase: 'active' });
    expect(sessions.holds(g as never)).toBe(true);
  });

  it('starts one when none is stored, showing the grant for every wallet, Ledger included', async () => {
    const { sessions, deps } = manager();
    await sessions.setWallet('ledger|0xabc|https://g');
    await sessions.ensure(guardian() as never, signer('eip712'));
    expect(deps.start).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ confirm: deps.confirm }));
  });

  it('resume never prompts', async () => {
    const { sessions, deps, states } = manager();
    await sessions.setWallet('para|0xabc|https://g');
    await sessions.resume(guardian() as never, signer());
    expect(deps.start).not.toHaveBeenCalled();
    expect(states.at(-1)).toEqual({ phase: 'off' });
  });

  it('asks once for two calls on the same client', async () => {
    const { sessions, deps } = manager();
    await sessions.setWallet('para|0xabc|https://g');
    const g = guardian();
    await Promise.all([sessions.ensure(g as never, signer()), sessions.ensure(g as never, signer())]);
    expect(deps.start).toHaveBeenCalledTimes(1);
  });

  it('another wallet ends every session: stored keys deleted first, then revoked, and an open grant closed', async () => {
    const { sessions, log } = manager({ stored: session('a') });
    await sessions.setWallet('para|0xaaa|https://g');
    log.length = 0;
    const g1 = guardian('one');
    const g2 = guardian('two');
    await sessions.ensure(g1 as never, signer());
    await sessions.resume(g2 as never, signer());
    g1.revokeSession.mockImplementation(async () => { log.push('revoke one'); return true; });
    g2.revokeSession.mockImplementation(async () => { log.push('revoke two'); return true; });
    await sessions.setWallet('para|0xbbb|https://g');
    expect(log).toEqual(['cancel confirm', 'remove guardian:a', 'remove guardian:a', 'revoke one', 'revoke two']);
    expect(sessions.holds(g1 as never)).toBe(false);
  });

  it('revokes, instead of keeping, a session that arrives after the wallet changed', async () => {
    let approve: (() => void) | undefined;
    const { sessions, states } = manager({ start: () => new Promise((resolve) => { approve = () => resolve(session('late')); }) });
    await sessions.setWallet('ledger|0xaaa|https://g');
    const g = guardian();
    const opening = sessions.ensure(g as never, signer());
    await vi.waitFor(() => expect(approve).toBeTypeOf('function'));
    await sessions.setWallet(null);
    approve!();
    await opening;
    expect(g.revokeSession).toHaveBeenCalledTimes(1);
    expect(sessions.holds(g as never)).toBe(false);
    expect(states.at(-1)).toEqual({ phase: 'off' });
  });

  it('stops using a session Guardian could not be reached to revoke', async () => {
    const kept = session('a');
    const { sessions } = manager({ stored: kept });
    await sessions.setWallet('para|0xaaa|https://g');
    const g = guardian();
    await sessions.ensure(g as never, signer());
    g.setSession(kept);
    g.revokeSession.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await sessions.endAll();
    expect(g.setSession).toHaveBeenLastCalledWith(null);
  });

  it('reports the end Guardian gave, and the expiry on its own', async () => {
    vi.useFakeTimers();
    const soon = Math.floor(Date.now() / 1000) + 60;
    const { sessions, states, ended } = manager({ stored: session('a', soon) });
    await sessions.setWallet('para|0xaaa|https://g');
    const g = guardian();
    await sessions.ensure(g as never, signer());
    expect(states.at(-1)).toEqual({ phase: 'active', expiresAt: soon });
    vi.advanceTimersByTime(61_000);
    expect(states.at(-1)).toEqual({ phase: 'ended', reason: 'expired' });
    // Guardian ending it (another tab logged out) is reported too.
    const held = session('b');
    const other = manager({ stored: held });
    await other.sessions.setWallet('para|0xaaa|https://g');
    await other.sessions.ensure(guardian() as never, signer());
    other.ended.at(-1)!('revoked', held);
    expect(other.states.at(-1)).toEqual({ phase: 'ended', reason: 'revoked' });
    expect(ended.length).toBeGreaterThan(0);
  });

  it('a session refused on one Guardian client is dead on all: every client stops using it and it reads as ended', async () => {
    const held = session('k');
    const { sessions, states, ended, store } = manager({ stored: held });
    await sessions.setWallet('para|0xaaa|https://g');
    const shared = guardian('multisig-client');
    const own = guardian('account');
    await sessions.ensure(shared as never, signer());
    await sessions.resume(own as never, signer());
    shared.setSession(held);
    own.setSession(held);
    expect(states.at(-1)).toMatchObject({ phase: 'active' });
    // Guardian refuses it on the account's own client (say, after a restart).
    ended.at(-1)!('rejected', held);
    expect(states.at(-1)).toEqual({ phase: 'ended', reason: 'rejected' });
    expect(shared.getSession()).toBeNull();
    expect(own.getSession()).toBeNull();
    expect(sessions.holds(shared as never)).toBe(false);
    expect(store.remove).toHaveBeenCalled();
  });

  it('reports an unsupported Guardian, a declined grant, a wallet that cosigns nothing and other failures', async () => {
    const cases: Array<[() => Promise<unknown>, GuardianSessionState | RegExp]> = [
      [async () => { throw new GuardianSessionsUnsupportedError(); }, { phase: 'unsupported' }],
      [async () => { throw new SessionGrantDeclinedError(); }, /declined/],
      [async () => { throw new GuardianHttpError(403, 'Forbidden', JSON.stringify({ error: 'not a cosigner' })); }, /cosigner/],
      [async () => { throw new Error('wallet closed'); }, /Could not start a Guardian session: wallet closed/],
    ];
    for (const [start, expected] of cases) {
      const { sessions, states } = manager({ start });
      await sessions.setWallet('para|0xaaa|https://g');
      await sessions.ensure(guardian() as never, signer());
      const last = states.at(-1)!;
      if (expected instanceof RegExp) expect(last).toMatchObject({ phase: 'failed', message: expect.stringMatching(expected) });
      else expect(last).toEqual(expected);
    }
  });
});

describe('retryIfSessionDied', () => {
  it('runs a request once more when it found the session dead, and only then', async () => {
    // Guardian's error envelope: { code, message, meta: { retryable } }.
    const dead = new GuardianHttpError(401, 'Unauthorized', JSON.stringify({ code: 'session_revoked', message: 'Session revoked', meta: { retryable: false } }));
    let calls = 0;
    await expect(retryIfSessionDied(async () => { if (++calls === 1) throw dead; return 'ok'; })).resolves.toBe('ok');
    expect(calls).toBe(2);
    calls = 0;
    await expect(retryIfSessionDied(async () => { calls++; throw new Error('other'); })).rejects.toThrow('other');
    expect(calls).toBe(1);
  });
});

describe('session times', () => {
  it('rounds a grant that ends a minute short of the hour to the hour', () => {
    expect(sessionLengthText(8 * 3600 - 60)).toBe('8 hours');
    expect(sessionLengthText(3600)).toBe('1 hour');
    expect(sessionLengthText(90 * 60)).toBe('1 h 30 min');
    expect(sessionLengthText(25 * 60)).toBe('25 min');
    expect(sessionLengthText(20)).toBe('under a minute');
  });

  it('gives the end time alone today, and with the date on another day', () => {
    const now = new Date(2026, 9, 25, 10, 0);
    const today = untilText(new Date(2026, 9, 25, 18, 35).getTime() / 1000, now);
    const tomorrow = untilText(new Date(2026, 9, 26, 2, 35).getTime() / 1000, now);
    expect(today).toMatch(/35/);
    expect(today).not.toMatch(/Oct/);
    expect(tomorrow).toMatch(/Oct/);
  });
});

describe('grantDialogRows', () => {
  const rows = ['Signer', 'Session key', 'Website', 'Valid from', 'Expires', 'Scope', 'Guardian key', 'Network']
    .map((label) => ({ label, value: label === 'Scope' ? 'Every account this signer cosigns' : `${label} value` }));

  it('always takes the scope out of the details, for the banner', () => {
    const { scope, details } = grantDialogRows(rows, true);
    expect(scope).toBe('Every account this signer cosigns');
    expect(details.map((r) => r.label)).toEqual(['Signer', 'Session key', 'Website', 'Guardian key', 'Network']);
  });

  it('keeps the start and end in the details when the length cannot be shown', () => {
    expect(grantDialogRows(rows, false).details.map((r) => r.label)).toContain('Expires');
  });
});

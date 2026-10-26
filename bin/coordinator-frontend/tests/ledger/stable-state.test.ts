import { describe, expect, it } from 'vitest';
import { copyUnlessSame, keepIfSame, sameData } from '../../src/lib/stableState';

const config = () => ({
  threshold: 2,
  numSigners: 3,
  signerCommitments: ['0xa', '0xb', '0xc'],
  guardianCommitment: '0xg',
  vaultBalances: [{ faucetId: '0xe69e', amount: 262_500_000n }],
  procedureThresholds: new Map([['send', 1]]),
});
const proposal = (signatures: string[]) => ({
  id: '0xp',
  nonce: 7,
  status: 'pending',
  signatures: signatures.map((signerId) => ({ signerId, signature: { scheme: 'ecdsa', signature: '0x1' } })),
  metadata: { proposalType: 'p2id', amount: '5' },
  verification: { status: 'verified' },
});

describe('a sync that finds nothing new leaves the screen alone', () => {
  it('keeps the shown value when the fresh read holds the same data', () => {
    const shown = config();
    expect(keepIfSame(config())(shown)).toBe(shown);
    const proposals = [proposal(['0xa'])];
    expect(keepIfSame([proposal(['0xa'])])(proposals)).toBe(proposals);
  });

  it('replaces it as soon as anything differs: a balance, a signature, a status, a threshold', () => {
    const shown = config();
    const moreFunds = { ...config(), vaultBalances: [{ faucetId: '0xe69e', amount: 262_500_001n }] };
    expect(keepIfSame(moreFunds)(shown)).toBe(moreFunds);
    const proposals = [proposal(['0xa'])];
    const signed = [proposal(['0xa', '0xb'])];
    expect(keepIfSame(signed)(proposals)).toBe(signed);
    expect(sameData([{ ...proposal([]), status: 'pending' }], [{ ...proposal([]), status: 'ready' }])).toBe(false);
    expect(sameData(config(), { ...config(), procedureThresholds: new Map([['send', 2]]) })).toBe(false);
    expect(sameData(config(), { ...config(), procedureThresholds: new Map() })).toBe(false);
  });

  it('compares bigints, bytes, order and missing keys exactly', () => {
    expect(sameData(1n, 1n)).toBe(true);
    expect(sameData(1n, 1)).toBe(false);
    expect(sameData(new Uint8Array([1, 2]), new Uint8Array([1, 2]))).toBe(true);
    expect(sameData(new Uint8Array([1, 2]), new Uint8Array([2, 1]))).toBe(false);
    expect(sameData(['a', 'b'], ['b', 'a'])).toBe(false);
    expect(sameData({ a: undefined }, { b: undefined })).toBe(false);
    expect(sameData(null, {})).toBe(false);
  });

  it('treats objects it cannot look into (class instances) as changed, never as equal', () => {
    class Thing { constructor(public value: number) {} }
    expect(sameData(new Thing(1), new Thing(1))).toBe(false);
    const thing = new Thing(1);
    expect(sameData(thing, thing)).toBe(true);
  });
});

describe('state holds copies the SDK cannot change', () => {
  it('a later in-place change to the SDK object is seen as a change, not hidden', () => {
    const sdkObject = proposal(['0xa']);
    const shown = copyUnlessSame([] as ReturnType<typeof proposal>[], [sdkObject]);
    // The SDK re-checks the proposal and records the outcome on its own object.
    (sdkObject as { verification: object }).verification = { status: 'failed', retryable: true, message: 'stale' };
    expect(shown[0].verification).toEqual({ status: 'verified' });
    // The next read carries the change, and the copy shown differs from it.
    const next = [proposal(['0xa'])];
    (next[0] as { verification: object }).verification = { status: 'failed', retryable: true, message: 'stale' };
    expect(keepIfSame(next)(shown)).toBe(next);
  });

  it('keeps the very same state when an update returns it', () => {
    const shown = [proposal(['0xa'])];
    expect(copyUnlessSame(shown, shown)).toBe(shown);
  });
});

import { describe, expect, it } from 'vitest';
import { getProposalActionState, isOutdated, proposalStage } from '../../src/lib/proposalActions';

const SIGNER = `0x${'1'.repeat(64)}`;
const config = { threshold: 2, signerCommitments: [SIGNER], procedureThresholds: [] } as never;
const proposal = (nonce: number) => ({
  id: '0xp',
  nonce,
  status: 'pending',
  signatures: [],
  metadata: { proposalType: 'p2id', requiredSignatures: 2 },
  verification: { status: 'verified' },
}) as never;

describe('outdated proposals (Guardian 0.18.1 labels each with the account nonce it reaches)', () => {
  it('asks for signatures while the proposal is built on the current state', () => {
    expect(getProposalActionState(proposal(6), config, SIGNER, 0, 5n).action).toBe('sign');
  });

  it('offers to create it again once another transaction took its slot, instead of collecting signatures', () => {
    for (const accountNonce of [6n, 7n]) {
      const state = getProposalActionState(proposal(6), config, SIGNER, 0, accountNonce);
      expect(state).toMatchObject({ action: 'recreate', actionLabel: 'Create again', statusLabel: 'Outdated: another transaction was executed first' });
    }
  });

  it('never marks a proposal while the account nonce is unknown, nor an older timestamp-labelled one', () => {
    expect(getProposalActionState(proposal(6), config, SIGNER, 0, null).action).toBe('sign');
    expect(getProposalActionState(proposal(1_760_000_000_000), config, SIGNER, 0, 9n).action).toBe('sign');
  });
});

describe('proposal stages (what the Transactions page counts)', () => {
  const at = (status: string, nonce: number, verification: object = { status: 'verified' }) =>
    ({ ...(proposal(nonce) as object), status, verification }) as never;
  const stage = (p: never, accountNonce: bigint | null = 5n) =>
    proposalStage(p, getProposalActionState(p, config, SIGNER, 0, accountNonce));

  it('counts a proposal that needs signatures as waiting, and an outdated one apart', () => {
    expect(stage(at('pending', 6))).toBe('waiting');
    expect(stage(at('pending', 5))).toBe('stale');
    expect(isOutdated({ nonce: 5 }, 5n)).toBe(true);
    expect(isOutdated({ nonce: 6 }, 5n)).toBe(false);
    expect(isOutdated({ nonce: 5 }, null)).toBe(false);
  });

  it('counts one that can never execute as stale, a temporary failure as waiting, and an executed one as done', () => {
    expect(stage(at('pending', 6, { status: 'failed', retryable: false, message: 'x' }))).toBe('stale');
    expect(stage(at('pending', 6, { status: 'failed', retryable: true, message: 'x' }))).toBe('waiting');
    expect(stage(at('finalized', 5))).toBe('done');
  });
});

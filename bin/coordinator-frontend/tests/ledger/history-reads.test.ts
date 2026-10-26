import { describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/MultisigContext', () => ({ useMultisig: () => ({}) }));
const { NoSession, quietRead, readFirst } = await import('../../src/hooks/useTransactionHistory');

const row = (nonce: number) => ({ nonce, status: 'canonical', timestamp: '2026-10-26T09:00:00Z', inputNotes: [], outputNotes: [], decodeWarnings: [] });

describe('automatic history reads never ask the wallet', () => {
  it('sends only while a session is held, and stops without sending once it is gone', async () => {
    let held = true;
    const send = quietRead(() => held);
    const request = vi.fn(async () => 'page');
    await expect(send(request)).resolves.toBe('page');
    held = false;
    await expect(send(request)).rejects.toBeInstanceOf(NoSession);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('stops mid-way through 0.18.0 pages when the session goes, instead of signing with the wallet', async () => {
    let held = true;
    const deltaHistory = vi.fn(async ({ cursor }: { cursor?: string }) => {
      held = false; // the session ends while the first page is read
      return cursor ? { entries: [row(5)] } : { entries: [row(1_760_000_000_000)], nextCursor: 'next' };
    });
    await expect(readFirst({ deltaHistory } as never, quietRead(() => held))).rejects.toBeInstanceOf(NoSession);
    expect(deltaHistory).toHaveBeenCalledTimes(1);
  });

  it('an empty first page with a cursor is just empty, not a crash', async () => {
    const deltaHistory = vi.fn(async () => ({ entries: [], nextCursor: 'more' }));
    await expect(readFirst({ deltaHistory } as never, (request) => request())).resolves.toEqual({ entries: [], cursor: 'more' });
  });

  it('reads on past rows keyed by time (0.18.0) to the first row keyed by nonce', async () => {
    const deltaHistory = vi.fn(async ({ cursor }: { cursor?: string }) =>
      cursor ? { entries: [row(9), row(8)] } : { entries: [row(1_760_000_000_001), row(1_760_000_000_000)], nextCursor: 'next' });
    const result = await readFirst({ deltaHistory } as never, (request) => request());
    expect(result.entries.map((entry) => entry.nonce)).toEqual([1_760_000_000_001, 1_760_000_000_000, 9, 8]);
  });
});

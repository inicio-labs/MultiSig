import { describe, expect, it, vi } from 'vitest';
import {
  BACKGROUND_SYNC_MS,
  MIN_SYNC_GAP_MS,
  BACKGROUND_WAIT_MS,
  SESSION_MARGIN_MS,
  settleWithin,
  shouldBackgroundSync,
  type BackgroundSyncInput,
} from '../../src/lib/backgroundSync';

const now = 1_790_000_000_000;
const ready: BackgroundSyncInput = {
  accountOpen: true,
  busy: false,
  running: false,
  walletSource: 'miden-wallet',
  hasLocalSigner: false,
  // Guardian's expiresAt is Unix seconds.
  session: { phase: 'active', expiresAt: Math.floor(now / 1000) + 30 * 60 },
  visible: true,
  lastSyncAt: now - BACKGROUND_SYNC_MS,
  now,
};

describe('syncing on its own, without asking the wallet', () => {
  it('syncs an open account every interval while a Guardian session signs the reads', () => {
    expect(BACKGROUND_SYNC_MS).toBe(30_000);
    expect(shouldBackgroundSync(ready)).toBe(true);
    for (const walletSource of ['para', 'ledger'] as const) {
      expect(shouldBackgroundSync({ ...ready, walletSource })).toBe(true);
    }
  });

  it('never syncs without a session: each read would ask the wallet (on Ledger, the device)', () => {
    for (const session of [
      { phase: 'off' },
      { phase: 'resuming' },
      { phase: 'starting' },
      { phase: 'ended', reason: 'expired' },
      { phase: 'failed', message: 'declined' },
      { phase: 'unsupported' },
    ] as const) {
      expect(shouldBackgroundSync({ ...ready, session })).toBe(false);
    }
    // About to expire: it could end mid-sync and the rest would ask the wallet.
    expect(shouldBackgroundSync({ ...ready, session: { phase: 'active', expiresAt: (now + SESSION_MARGIN_MS) / 1000 - 1 } })).toBe(false);
    expect(shouldBackgroundSync({ ...ready, session: { phase: 'active', expiresAt: (now + SESSION_MARGIN_MS) / 1000 + 1 } })).toBe(true);
    // An expiry that has passed (seconds compared with seconds, not milliseconds).
    expect(shouldBackgroundSync({ ...ready, session: { phase: 'active', expiresAt: Math.floor(now / 1000) - 5 } })).toBe(false);
  });

  it('a local key signs without asking, so it needs no session', () => {
    expect(shouldBackgroundSync({ ...ready, walletSource: 'local', hasLocalSigner: true, session: { phase: 'off' } })).toBe(true);
    expect(shouldBackgroundSync({ ...ready, walletSource: 'local', hasLocalSigner: false, session: { phase: 'off' } })).toBe(false);
  });

  it('waits while the user is doing something, while hidden, and right after another sync', () => {
    expect(shouldBackgroundSync({ ...ready, busy: true })).toBe(false);
    expect(shouldBackgroundSync({ ...ready, running: true })).toBe(false);
    expect(shouldBackgroundSync({ ...ready, visible: false })).toBe(false);
    expect(shouldBackgroundSync({ ...ready, accountOpen: false })).toBe(false);
    expect(shouldBackgroundSync({ ...ready, lastSyncAt: now - MIN_SYNC_GAP_MS + 1 })).toBe(false);
    expect(shouldBackgroundSync({ ...ready, lastSyncAt: now - MIN_SYNC_GAP_MS })).toBe(true);
  });
});

describe('an operation waits for a background sync in flight, but not forever', () => {
  it('goes ahead as soon as the sync settles, failed or not', async () => {
    await expect(settleWithin(Promise.resolve())).resolves.toBeUndefined();
    await expect(settleWithin(Promise.reject(new Error('node down')))).resolves.toBeUndefined();
    await expect(settleWithin(null)).resolves.toBeUndefined();
  });

  it('goes ahead after the limit when the sync never answers', async () => {
    vi.useFakeTimers();
    try {
      let done = false;
      const waiting = settleWithin(new Promise(() => {})).then(() => { done = true; });
      await vi.advanceTimersByTimeAsync(BACKGROUND_WAIT_MS - 1);
      expect(done).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await waiting;
      expect(done).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

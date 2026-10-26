import type { GuardianSessionState } from './guardianSession';
import type { WalletSource } from '@/wallets/types';

/**
 * The account syncs on its own, silently, so new proposals, cosigners'
 * signatures and incoming notes show up without the Sync button: every
 * BACKGROUND_SYNC_MS while the tab is visible, and when the user comes back to
 * the tab. Every sync reads Guardian with signed requests, so it runs only
 * when those need no wallet (a Guardian session, or a local key); otherwise
 * each one would ask the wallet (on Ledger, the device). The Sync button stays
 * for everyone.
 */
export const BACKGROUND_SYNC_MS = 30_000;
/** No background sync this soon after the last sync (actions sync on their own). */
export const MIN_SYNC_GAP_MS = 20_000;
/** A session about to expire could end mid-sync, and the rest would ask the wallet. */
export const SESSION_MARGIN_MS = 60_000;
/** Background failures stay silent until this many in a row. */
export const FAILURES_BEFORE_ERROR = 3;
/** How long an operation waits for a background sync in flight before going ahead anyway. */
export const BACKGROUND_WAIT_MS = 15_000;

/**
 * Waits for `run` (a background sync in flight) to settle, at most `ms`: an
 * operation must not hang on a request that never answers. Going ahead is safe
 * then: the sync drops its results once the operation shows as busy.
 */
export function settleWithin(run: Promise<unknown> | null | undefined, ms = BACKGROUND_WAIT_MS): Promise<void> {
  if (!run) return Promise.resolve();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<void>((resolve) => { timer = setTimeout(resolve, ms); });
  return Promise.race([run.then(() => undefined, () => undefined), limit]).finally(() => clearTimeout(timer));
}

export interface BackgroundSyncInput {
  accountOpen: boolean;
  /** Any account operation (sign, execute, send, load, a manual sync…) is running. */
  busy: boolean;
  /** A background sync is already running. */
  running: boolean;
  walletSource: WalletSource;
  hasLocalSigner: boolean;
  session: GuardianSessionState;
  visible: boolean;
  lastSyncAt: number;
  now: number;
}

/** Whether Guardian requests can be signed now without asking the wallet. */
export function signsWithoutWallet(
  walletSource: WalletSource,
  hasLocalSigner: boolean,
  session: GuardianSessionState,
  now: number,
): boolean {
  if (walletSource === 'local') return hasLocalSigner;
  // Guardian's expiresAt is in seconds (Unix time); `now` in milliseconds.
  return session.phase === 'active' && session.expiresAt * 1000 - now > SESSION_MARGIN_MS;
}

export function shouldBackgroundSync(input: BackgroundSyncInput): boolean {
  return input.accountOpen
    && !input.busy
    && !input.running
    && input.visible
    && input.now - input.lastSyncAt >= MIN_SYNC_GAP_MS
    && signsWithoutWallet(input.walletSource, input.hasLocalSigner, input.session, input.now);
}

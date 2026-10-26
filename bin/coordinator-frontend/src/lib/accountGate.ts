import type { WalletSource } from '@/wallets/types';

/**
 * What the dashboard shows instead of a page while no account is open: on a
 * return visit the wallet reconnects on its own when it can (the Miden Wallet
 * and Para remember this site; Ledger always needs a click), then the saved
 * account opens. Never a page of made-up zeros.
 */
export type GateView =
  | { kind: 'open' }
  | { kind: 'opening' }
  | { kind: 'connecting'; wallet: WalletSource }
  | { kind: 'connect'; wallet: WalletSource }
  | { kind: 'session-ended'; wallet: WalletSource }
  | { kind: 'failed'; message: string; retry: 'startup' | 'load' }
  | { kind: 'no-account' };

export interface GateInput {
  accountOpen: boolean;
  /** The account this browser opened last. */
  savedId: string | null;
  walletSource: WalletSource;
  walletConnected: boolean;
  loading: boolean;
  startupError: string | null;
  error: string | null;
  /** The wait for a wallet that reconnects on its own is over. */
  waitedForWallet: boolean;
  /** The account was closed because its Guardian session ended: it opens again only on a click. */
  sessionEnded: boolean;
}

/** How long the dashboard waits for the Miden Wallet or Para to reconnect before offering the button. */
export const WALLET_RECONNECT_WAIT_MS = 3000;

export function gateView(input: GateInput): GateView {
  if (input.accountOpen) return { kind: 'open' };
  if (!input.savedId) return { kind: 'no-account' };
  if (input.startupError) return { kind: 'failed', message: input.startupError, retry: 'startup' };
  if (input.loading) return { kind: 'opening' };
  if (input.sessionEnded) return { kind: 'session-ended', wallet: input.walletSource };
  if (input.walletConnected) {
    return input.error ? { kind: 'failed', message: input.error, retry: 'load' } : { kind: 'opening' };
  }
  // Local keys need no wallet; they are read as the app starts.
  if (input.walletSource === 'local') return { kind: 'opening' };
  if (input.walletSource === 'ledger' || input.waitedForWallet) return { kind: 'connect', wallet: input.walletSource };
  return { kind: 'connecting', wallet: input.walletSource };
}

export const WALLET_NAME: Record<WalletSource, string> = {
  'miden-wallet': 'Miden Wallet',
  para: 'Para',
  ledger: 'Ledger',
  local: 'Local key',
};

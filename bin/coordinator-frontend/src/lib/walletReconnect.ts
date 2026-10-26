import type { WalletReadyState } from '@miden-sdk/miden-wallet-adapter-base';

// The enum's value, not the enum: the adapter package ships only an ES module
// entry, which the unit tests cannot load (see midenWalletNetwork.ts).
const INSTALLED = 'Installed' as WalletReadyState;

interface ReadyEvents {
  readyState: WalletReadyState;
  on(event: 'readyStateChange', listener: (state: WalletReadyState) => void): unknown;
  off(event: 'readyStateChange', listener: (state: WalletReadyState) => void): unknown;
}

/** Set when the user disconnects the Miden Wallet: it is not reconnected on its own until they connect it again. */
export const MIDEN_WALLET_DISCONNECTED = 'miden-wallet-disconnected';

export function midenWalletDisconnectedByUser(): boolean {
  try {
    return Boolean(localStorage.getItem(MIDEN_WALLET_DISCONNECTED));
  } catch {
    return false;
  }
}

/**
 * Runs `ask` once the adapter has found the wallet extension: at once when it
 * already has, else on its readyStateChange to Installed. The adapter looks
 * for the extension by polling (about once a second), and connect() before
 * that fails as "not ready", so a connect at page load must wait for it.
 * Returns a cancel function; `ask` runs at most once.
 */
export function whenWalletInstalled(adapter: ReadyEvents, ask: () => void): () => void {
  let done = false;
  const onReady = (state: WalletReadyState) => {
    if (state === INSTALLED) run();
  };
  const run = () => {
    if (done) return;
    done = true;
    adapter.off('readyStateChange', onReady);
    ask();
  };
  if (adapter.readyState === INSTALLED) run();
  else adapter.on('readyStateChange', onReady);
  return () => {
    done = true;
    adapter.off('readyStateChange', onReady);
  };
}

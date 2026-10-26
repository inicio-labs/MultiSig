import { describe, expect, it, vi } from 'vitest';
import { gateView, shouldOpenSavedAccount, type GateInput } from '../../src/lib/accountGate';
import { readAccountSnapshot, saveAccountSnapshot, type AccountSnapshot } from '../../src/lib/accountSnapshot';
import { whenWalletInstalled } from '../../src/lib/walletReconnect';

const ID = '0x7cf0a4456218bfb111c55a10d5435a';
const base: GateInput = {
  accountOpen: false,
  savedId: ID,
  walletSource: 'miden-wallet',
  walletConnected: false,
  loading: false,
  startupError: null,
  error: null,
  waitedForWallet: false,
  sessionEnded: false,
};

describe('the dashboard before an account is open', () => {
  it('shows the page once the account is open, and never a page of zeros before', () => {
    expect(gateView({ ...base, accountOpen: true })).toEqual({ kind: 'open' });
    expect(gateView(base).kind).not.toBe('open');
  });

  it('waits for the Miden Wallet or Para to reconnect on their own, then names the wallet to connect', () => {
    expect(gateView(base)).toEqual({ kind: 'connecting', wallet: 'miden-wallet' });
    expect(gateView({ ...base, waitedForWallet: true })).toEqual({ kind: 'connect', wallet: 'miden-wallet' });
    expect(gateView({ ...base, walletSource: 'para' })).toEqual({ kind: 'connecting', wallet: 'para' });
    expect(gateView({ ...base, walletSource: 'para', waitedForWallet: true })).toEqual({ kind: 'connect', wallet: 'para' });
  });

  it('asks for Ledger at once: it cannot connect without a click', () => {
    expect(gateView({ ...base, walletSource: 'ledger' })).toEqual({ kind: 'connect', wallet: 'ledger' });
  });

  it('opens the account once a wallet is connected, and says why when it could not', () => {
    expect(gateView({ ...base, walletConnected: true })).toEqual({ kind: 'opening' });
    expect(gateView({ ...base, loading: true })).toEqual({ kind: 'opening' });
    expect(gateView({ ...base, walletConnected: true, error: 'Account not found on Guardian' }))
      .toEqual({ kind: 'failed', message: 'Account not found on Guardian', retry: 'load' });
    expect(gateView({ ...base, startupError: 'Not connected to Guardian.' }))
      .toEqual({ kind: 'failed', message: 'Not connected to Guardian.', retry: 'startup' });
  });

  it('after the session ended, says so and waits for a click, even with the wallet still connected', () => {
    for (const walletSource of ['miden-wallet', 'para', 'ledger'] as const) {
      expect(gateView({ ...base, walletSource, walletConnected: true, sessionEnded: true }))
        .toEqual({ kind: 'session-ended', wallet: walletSource });
    }
    // The click opens it again: from then on it is opening.
    expect(gateView({ ...base, walletConnected: true, sessionEnded: true, loading: true })).toEqual({ kind: 'opening' });
  });

  it('a local key needs no wallet; with no saved account there is nothing to open', () => {
    expect(gateView({ ...base, walletSource: 'local' })).toEqual({ kind: 'opening' });
    expect(gateView({ ...base, savedId: null })).toEqual({ kind: 'no-account' });
  });
});

function memoryStorage() {
  const items = new Map<string, string>();
  return { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value), items };
}

describe('opening the saved account once per wallet connection', () => {
  const open = (walletKey: string | null, triedKey: string | null, extra: Partial<Parameters<typeof shouldOpenSavedAccount>[0]> = {}) =>
    shouldOpenSavedAccount({ accountOpen: false, loading: false, savedId: ID, walletKey, triedKey, ...extra });

  it('opens it when a wallet connects, once', () => {
    expect(open(`${ID}|miden-wallet|0xkey`, null)).toBe(true);
    expect(open(`${ID}|miden-wallet|0xkey`, `${ID}|miden-wallet|0xkey`)).toBe(false);
  });

  it('after a session end the same wallet waits for the click, but another wallet that connects opens it', () => {
    const openWith = `${ID}|miden-wallet|0xkey`; // tried while the account was open
    expect(open(openWith, openWith)).toBe(false);
    expect(open(`${ID}|para|0xpara`, openWith)).toBe(true);
  });

  it('never while loading, already open, without a wallet or a saved account', () => {
    expect(open('k', null, { loading: true })).toBe(false);
    expect(open('k', null, { accountOpen: true })).toBe(false);
    expect(open(null, null)).toBe(false);
    expect(open('k', null, { savedId: null })).toBe(false);
  });

  it('keeps "Session ended" (not "Opening…") while another wallet is being connected and not yet loading', () => {
    // The original wallet is still connected and was tried; the user picked Para and cancelled.
    expect(gateView({ ...base, walletConnected: true, sessionEnded: true })).toEqual({ kind: 'session-ended', wallet: 'miden-wallet' });
  });
});

describe('the account as this browser last saw it', () => {
  const snapshot: AccountSnapshot = {
    accountId: ID,
    address: 'mm1ar02mstexampleu90ljh',
    threshold: 2,
    signerCount: 3,
    vaultBalances: [{ faucetId: '0xe69e6ca6e39df1b10c1e5399399feb', amount: 262_500_000n }],
    savedAt: 1_790_000_000_000,
  };

  it('comes back for the same account (any case), per network', () => {
    const storage = memoryStorage();
    saveAccountSnapshot(snapshot, 'mainnet', storage);
    expect(readAccountSnapshot(ID.toUpperCase().replace('0X', '0x'), 'mainnet', storage)).toEqual(snapshot);
    expect(readAccountSnapshot(ID, 'testnet', storage)).toBeNull();
    expect(readAccountSnapshot('0xdeadc17b13b218c14cfa7801d10884', 'mainnet', storage)).toBeNull();
    expect(readAccountSnapshot(null, 'mainnet', storage)).toBeNull();
  });

  it('is ignored when edited into something else', () => {
    const storage = memoryStorage();
    saveAccountSnapshot(snapshot, 'mainnet', storage);
    const key = [...storage.items.keys()][0];
    const saved = JSON.parse(storage.items.get(key)!);
    for (const broken of [
      { ...saved, vaultBalances: [{ faucetId: '0xe69e', amount: '-5' }] },
      { ...saved, vaultBalances: [{ faucetId: 'not-an-id', amount: '5' }] },
      { ...saved, threshold: 1.5 },
      { ...saved, vaultBalances: 'lots' },
    ]) {
      storage.items.set(key, JSON.stringify(broken));
      expect(readAccountSnapshot(ID, 'mainnet', storage)).toBeNull();
    }
    storage.items.set(key, '{not json');
    expect(readAccountSnapshot(ID, 'mainnet', storage)).toBeNull();
    storage.items.set(key, JSON.stringify({ ...saved, address: 'javascript:alert(1)' }));
    expect(readAccountSnapshot(ID, 'mainnet', storage)?.address).toBeUndefined();
  });

  it('never breaks the page when storage is unavailable', () => {
    const throwing = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(() => saveAccountSnapshot(snapshot, 'mainnet', throwing)).not.toThrow();
    expect(readAccountSnapshot(ID, 'mainnet', throwing)).toBeNull();
  });
});

describe('reconnecting the Miden Wallet at page load', () => {
  function fakeAdapter(readyState: string) {
    const listeners = new Set<(state: string) => void>();
    return {
      readyState,
      on: (_: string, listener: (state: string) => void) => listeners.add(listener),
      off: (_: string, listener: (state: string) => void) => listeners.delete(listener),
      emit(state: string) { this.readyState = state; [...listeners].forEach((listener) => listener(state)); },
      listeners,
    };
  }

  it('waits until the adapter has found the extension (connect before that fails as "not ready")', () => {
    const adapter = fakeAdapter('NotDetected');
    const ask = vi.fn();
    whenWalletInstalled(adapter as never, ask);
    expect(ask).not.toHaveBeenCalled();
    adapter.emit('Loadable');
    expect(ask).not.toHaveBeenCalled();
    adapter.emit('Installed');
    adapter.emit('Installed');
    expect(ask).toHaveBeenCalledTimes(1);
    expect(adapter.listeners.size).toBe(0);
  });

  it('asks at once when the extension is already found, and never after cancel', () => {
    const found = vi.fn();
    whenWalletInstalled(fakeAdapter('Installed') as never, found);
    expect(found).toHaveBeenCalledTimes(1);

    const adapter = fakeAdapter('NotDetected');
    const cancelled = vi.fn();
    whenWalletInstalled(adapter as never, cancelled)();
    adapter.emit('Installed');
    expect(cancelled).not.toHaveBeenCalled();
  });
});

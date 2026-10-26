import { MIDEN_NETWORK, TESTNET_DB_NAME, TESTNET_SESSION_DB_NAME } from '@/config/psm';
import { deleteDatabase } from './clientStartup';
import { STORAGE_PREFIX, staleKeys } from './freshStartKeys';
import { TESTNET_PREF_KEYS } from './prefs';
import { telegramCloud } from './telegram';

/**
 * Mainnet starts clean: the first time a phone opens the mainnet wallet, every
 * trace of testnet is removed — its chain database and Guardian session keys,
 * the saved balance and first paint, remembered accounts, contacts, token
 * caches, and the testnet registrations' flags in Telegram's cloud (pay by
 * @username, payment alerts, the nudges). People register again on mainnet.
 * Kept: hide amounts and sound (the person's preferences) and the cached
 * public key of the Privy wallet (the same key on every network). Runs once.
 */
const DONE_KEY = `${STORAGE_PREFIX}fresh-start:${MIDEN_NETWORK}`;

export async function freshStart(): Promise<void> {
  if (MIDEN_NETWORK !== 'mainnet' || typeof window === 'undefined') return;
  let local: Storage;
  try {
    local = window.localStorage;
    if (local.getItem(DONE_KEY)) return;
  } catch {
    return; // no storage on this phone: nothing kept, nothing to clean
  }
  const keys = Array.from({ length: local.length }, (_, i) => local.key(i)).filter((k): k is string => k !== null);
  for (const key of staleKeys(keys)) {
    try { local.removeItem(key); } catch { /* best effort */ }
  }
  await Promise.all([
    deleteDatabase(TESTNET_DB_NAME).catch(() => undefined),
    deleteDatabase(TESTNET_SESSION_DB_NAME).catch(() => undefined),
    telegramCloud()?.remove(TESTNET_PREF_KEYS).catch(() => undefined),
  ]);
  try { local.setItem(DONE_KEY, String(Date.now())); } catch { /* runs again next time: harmless */ }
}

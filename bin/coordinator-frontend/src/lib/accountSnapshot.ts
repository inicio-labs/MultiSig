import type { MidenNetwork } from './midenNetwork';

/**
 * What the dashboard last knew of an account, kept in this browser so a
 * return visit can show it while the fresh state loads (signing still waits
 * for the fresh state). Display only: nothing here is trusted for an action.
 */
export interface AccountSnapshot {
  accountId: string;
  /** The account's Miden address, so it can be shown before the SDK starts. */
  address?: string;
  threshold: number;
  signerCount: number;
  vaultBalances: Array<{ faucetId: string; amount: bigint }>;
  savedAt: number;
}

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

const snapshotKey = (network: MidenNetwork) => `miden-account-snapshot:${network}`;
const HEX_ID = /^0x[0-9a-f]+$/i;
const DIGITS = /^\d+$/;
const isCount = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0;
const sameId = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Keeps the last loaded account's snapshot (one per network). */
export function saveAccountSnapshot(snapshot: AccountSnapshot, network: MidenNetwork, storage: Storage | undefined = globalThis.localStorage): void {
  try {
    storage?.setItem(snapshotKey(network), JSON.stringify({
      ...snapshot,
      vaultBalances: snapshot.vaultBalances.map(({ faucetId, amount }) => ({ faucetId, amount: amount.toString() })),
    }));
  } catch {
    /* storage unavailable or full: the next visit just waits for the fresh state */
  }
}

/** The snapshot of `accountId`, or null when there is none or it does not parse. */
export function readAccountSnapshot(accountId: string | null, network: MidenNetwork, storage: Storage | undefined = globalThis.localStorage): AccountSnapshot | null {
  if (!accountId) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(storage?.getItem(snapshotKey(network)) ?? 'null');
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const { accountId: id, address, threshold, signerCount, vaultBalances, savedAt } = raw as Record<string, unknown>;
  if (typeof id !== 'string' || !HEX_ID.test(id) || !sameId(id, accountId)) return null;
  if (!isCount(threshold) || !isCount(signerCount) || !isCount(savedAt) || !Array.isArray(vaultBalances)) return null;
  const balances: AccountSnapshot['vaultBalances'] = [];
  for (const entry of vaultBalances as Array<Record<string, unknown>>) {
    if (typeof entry?.faucetId !== 'string' || !HEX_ID.test(entry.faucetId)) return null;
    if (typeof entry.amount !== 'string' || !DIGITS.test(entry.amount)) return null;
    balances.push({ faucetId: entry.faucetId, amount: BigInt(entry.amount) });
  }
  return {
    accountId: id,
    ...(typeof address === 'string' && /^[a-z]+1[02-9ac-hj-np-z]+$/.test(address) ? { address } : {}),
    threshold,
    signerCount,
    vaultBalances: balances,
    savedAt,
  };
}

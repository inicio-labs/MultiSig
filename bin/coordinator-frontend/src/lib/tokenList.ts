import mainnet from '@/config/tokenList/mainnet.json';
import testnet from '@/config/tokenList/testnet.json';
import { TOKEN_LIST_SOURCE } from '@/config/tokenList/source';
import { accountAddress } from './findAccounts';
import { BECH32_PREFIX, type MidenNetwork } from './midenNetwork';

/**
 * Miden's verified token lists (github.com/0xMiden/token-list). The app ships
 * a copy (scripts/update-token-list.mjs refreshes it) and, as the Miden Wallet
 * does, reads the live list too (refreshTokenList), so a token listed or
 * delisted after this build is shown as such. Anyone can create a token with
 * any name, symbol and logo, so a token whose faucet is not listed for this
 * network is marked Unverified. The network's own fee token is always verified.
 */
export interface ListedToken {
  /** The faucet's Miden address, without routing parameters. */
  faucetId: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export type TokenVerification = 'verified' | 'unverified' | 'unknown';

type Version = [major: number, minor: number, patch: number];
interface TokenList {
  tokens: ListedToken[];
  version: Version;
}

const BECH32_DATA = /^[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$/;
const isCount = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0;
const isText = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;

/**
 * A token-list file for `network`, or null when it is not one: every entry on
 * this network, a plain Miden address once each, text and decimals in range,
 * and a logo only at the repository's own path for that faucet.
 */
export function parseTokenList(json: unknown, network: MidenNetwork): TokenList | null {
  if (!json || typeof json !== 'object') return null;
  const { tokens, version } = json as { tokens?: unknown; version?: { major?: unknown; minor?: unknown; patch?: unknown } };
  if (!Array.isArray(tokens) || !version || !isCount(version.major) || !isCount(version.minor) || !isCount(version.patch)) return null;
  const prefix = `${BECH32_PREFIX[network]}1`;
  const seen = new Set<string>();
  const listed: ListedToken[] = [];
  for (const entry of tokens as Array<Record<string, unknown>>) {
    const { faucetId, symbol, name, decimals, logoURI } = entry ?? {};
    if (entry?.network !== network || typeof faucetId !== 'string' || !faucetId.startsWith(prefix)
      || !BECH32_DATA.test(faucetId.slice(prefix.length)) || seen.has(faucetId)) return null;
    if (!isText(symbol, 16) || !isText(name, 64) || !isCount(decimals) || decimals > 18) return null;
    if (logoURI !== undefined && logoURI !== `${TOKEN_LIST_SOURCE}main/logos/${faucetId}/logo.png`) return null;
    seen.add(faucetId);
    listed.push({ faucetId, symbol, name, decimals, ...(logoURI ? { logoURI } : {}) });
  }
  return { tokens: listed, version: [version.major, version.minor, version.patch] };
}

const SHIPPED: Partial<Record<MidenNetwork, TokenList>> = {
  mainnet: parseTokenList(mainnet, 'mainnet') ?? undefined,
  testnet: parseTokenList(testnet, 'testnet') ?? undefined,
};
/** The list in use per network: the shipped copy until a newer live one arrives. */
let inUse: Partial<Record<MidenNetwork, TokenList>> = { ...SHIPPED };
let lastRefresh: Partial<Record<MidenNetwork, number>> = {};

/** Back to the shipped lists (tests). */
export function resetTokenLists(): void {
  inUse = { ...SHIPPED };
  lastRefresh = {};
}

const olderThan = (a: Version, b: Version) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/** The live list is read at most this often. */
export const TOKEN_LIST_REFRESH_MS = 60_000;

/**
 * Reads the live list for `network` and uses it when it is valid and not older
 * than the one in use; otherwise the list in use stays. At most once a minute.
 * Resolves true when the list in use changed.
 */
export async function refreshTokenList(
  network: MidenNetwork,
  fetchList: typeof fetch = fetch,
  now: number = Date.now(),
): Promise<boolean> {
  const current = inUse[network];
  if (!current) return false;
  const last = lastRefresh[network];
  if (last !== undefined && now - last < TOKEN_LIST_REFRESH_MS) return false;
  lastRefresh[network] = now;
  try {
    const response = await fetchList(`${TOKEN_LIST_SOURCE}main/${network}.json`, { cache: 'no-cache' });
    if (!response.ok) return false;
    const live = parseTokenList(await response.json(), network);
    if (!live || olderThan(live.version, current.version) < 0) return false;
    inUse[network] = live;
    return JSON.stringify(live.tokens) !== JSON.stringify(current.tokens);
  } catch {
    return false;
  }
}

export function hasTokenList(network: MidenNetwork): boolean {
  return inUse[network] !== undefined;
}

/**
 * The listed token with this hex faucet ID on `network`, if any. Throws while
 * the Miden SDK is not ready to convert the ID, so a caller can tell "not
 * listed" from "not known yet".
 */
export function listedToken(faucetId: string, network: MidenNetwork): ListedToken | undefined {
  const list = inUse[network];
  if (!list) return undefined;
  const address = accountAddress(faucetId, network);
  return list.tokens.find((token) => token.faucetId === address);
}

/**
 * Verified when listed or the fee token; unverified when the network has a
 * list, the token is not on it and is not the fee token; unknown when there is
 * no list, or the lookup has not run (`listing` undefined) or the fee token is
 * not known yet (it may be this one), so a tag never shows and then goes away.
 */
export function tokenVerification(
  faucetId: string,
  network: MidenNetwork,
  listing: { token?: ListedToken } | undefined,
  nativeFaucetId: string | null,
): TokenVerification {
  if (nativeFaucetId && faucetId.toLowerCase() === nativeFaucetId.toLowerCase()) return 'verified';
  if (!hasTokenList(network) || !listing) return 'unknown';
  if (listing.token) return 'verified';
  return nativeFaucetId ? 'unverified' : 'unknown';
}

/**
 * The tokens Send offers: those with a balance above zero that are listed for
 * this network or are its fee token; on a network without a list, every one
 * with a balance. `pending` while the fee token is not known and an unlisted
 * token could be it. Throws while the Miden SDK cannot convert IDs.
 */
export function sendableTokens<T extends { faucetId: string; amount: bigint }>(
  balances: readonly T[],
  network: MidenNetwork,
  nativeFaucetId: string | null,
): { tokens: T[]; pending: boolean } {
  const held = balances.filter((balance) => balance.amount > 0n);
  if (!hasTokenList(network)) return { tokens: held, pending: false };
  let pending = false;
  const tokens = held.filter((balance) => {
    if (nativeFaucetId && balance.faucetId.toLowerCase() === nativeFaucetId.toLowerCase()) return true;
    if (listedToken(balance.faucetId, network)) return true;
    if (!nativeFaucetId) pending = true;
    return false;
  });
  return { tokens, pending };
}

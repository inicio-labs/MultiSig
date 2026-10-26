import type { MidenNetwork } from './midenNetwork';

/**
 * The 0xMiden token list (github.com/0xMiden/token-list): the verified
 * tokens of each network with their symbol and decimals. Fetched live from
 * GitHub once per app open so a token added to the list (USDCX is being
 * added) is picked up without a release; the last good copy is kept on the
 * phone for when GitHub cannot be reached.
 */
export const TOKEN_LIST_SOURCE = 'https://raw.githubusercontent.com/0xMiden/token-list/main';

/** Networks the list has a file for. */
export const LISTED_NETWORKS: readonly MidenNetwork[] = ['testnet', 'mainnet'];

export function tokenListUrl(network: MidenNetwork): string {
  return `${TOKEN_LIST_SOURCE}/${network}.json`;
}

export interface ListedToken {
  /** Hex account id, lowercase, 0x-prefixed (the list carries bech32). */
  faucetId: string;
  symbol: string;
  decimals: number;
  name: string;
  logoURI?: string;
}

/**
 * The list's entries for `network`, each checked before use: a bad entry is
 * skipped, never the whole list. `toHex` turns the list's bech32 ids into
 * the hex form the app uses (it needs the SDK's WebAssembly).
 */
export function parseTokenList(json: unknown, network: MidenNetwork, toHex: (id: string) => string): ListedToken[] {
  const tokens = (json as { tokens?: unknown } | null)?.tokens;
  if (!Array.isArray(tokens)) return [];
  const out: ListedToken[] = [];
  for (const entry of tokens) {
    const t = entry as Record<string, unknown>;
    if (t.network !== network) continue;
    const symbol = typeof t.symbol === 'string' ? t.symbol.trim() : '';
    const decimals = t.decimals;
    if (!symbol || typeof t.faucetId !== 'string' || !Number.isInteger(decimals) || (decimals as number) < 0 || (decimals as number) > 18) continue;
    let faucetId: string;
    try {
      faucetId = toHex(t.faucetId).toLowerCase();
    } catch {
      continue;
    }
    if (!/^0x[0-9a-f]{30}$/.test(faucetId)) continue;
    out.push({
      faucetId,
      symbol,
      decimals: decimals as number,
      name: typeof t.name === 'string' && t.name.trim() ? t.name.trim() : symbol,
      ...(typeof t.logoURI === 'string' && /^https:\/\//.test(t.logoURI) ? { logoURI: t.logoURI } : {}),
    });
  }
  return out;
}

const CACHE_KEY = 'miden-tg-wallet:token-list:';
const FETCH_TIMEOUT_MS = 6_000;

interface Cached { fetchedAt: number; tokens: ListedToken[] }

export interface TokenListDeps {
  network: MidenNetwork;
  toHex(id: string): string;
  fetchImpl?: typeof fetch;
  store?: { get(key: string): string | null; set(key: string, value: string): void };
  timeoutMs?: number;
}

export interface TokenList {
  /** The listed token with this hex faucet id, or null (not listed, or the list unavailable). */
  listed(faucetIdHex: string): Promise<ListedToken | null>;
  /** All listed tokens (fetched once per open; the phone's last copy when GitHub fails). */
  tokens(): Promise<ListedToken[]>;
}

export function createTokenList({ network, toHex, fetchImpl, store, timeoutMs = FETCH_TIMEOUT_MS }: TokenListDeps): TokenList {
  let loading: Promise<ListedToken[]> | null = null;
  const cacheKey = CACHE_KEY + network;

  const cached = (): ListedToken[] => {
    try {
      const raw = store?.get(cacheKey);
      const c = raw ? (JSON.parse(raw) as Cached) : null;
      return Array.isArray(c?.tokens) ? c.tokens : [];
    } catch {
      return [];
    }
  };

  const load = async (): Promise<ListedToken[]> => {
    if (!LISTED_NETWORKS.includes(network)) return [];
    const doFetch = fetchImpl ?? (typeof fetch === 'function' ? fetch : undefined);
    if (!doFetch) return cached();
    try {
      const response = await doFetch(tokenListUrl(network), {
        signal: AbortSignal.timeout(timeoutMs),
        credentials: 'omit',
        cache: 'no-cache',
      });
      if (!response.ok) throw new Error(`token list HTTP ${response.status}`);
      const tokens = parseTokenList(await response.json(), network, toHex);
      store?.set(cacheKey, JSON.stringify({ fetchedAt: Date.now(), tokens } satisfies Cached));
      return tokens;
    } catch (error) {
      console.warn('Token list not fetched; using the last copy on this phone', error);
      return cached();
    }
  };

  const tokens = () => {
    loading ??= load();
    return loading;
  };
  return {
    tokens,
    async listed(faucetIdHex) {
      const key = faucetIdHex.trim().toLowerCase();
      return (await tokens()).find((t) => t.faucetId === key) ?? null;
    },
  };
}

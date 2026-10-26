import { AccountId, BasicFungibleFaucetComponent, Endpoint, RpcClient } from '@miden-sdk/miden-sdk';
import { MIDEN_NETWORK, MIDEN_RPC_URL } from '@/config/psm';
import { toHexAccountId } from './helpers';
import type { MidenNetwork } from './midenNetwork';
import { storage } from './storage';
import { createTokenList, type ListedToken } from './tokenList';

/**
 * Converts a user-entered decimal amount into base units for a token with
 * `decimals` decimal places. Exact string arithmetic: no floating point, and
 * more fractional digits than the token supports is an error rather than a
 * silent rounding.
 */
export function parseTokenAmount(input: string, decimals: number): bigint {
  const value = input.trim();
  const match = /^(\d*)(?:\.(\d*))?$/.exec(value);
  if (!value || !match || (match[1] === '' && !match[2])) {
    throw new Error('Enter a valid amount');
  }
  const [, whole, fraction = ''] = match;
  if (fraction.length > decimals) {
    throw new Error(
      decimals === 0
        ? 'This token does not support fractional amounts'
        : `This token supports at most ${decimals} decimal places`,
    );
  }
  const units = BigInt(`${whole || '0'}${fraction.padEnd(decimals, '0')}`);
  if (units <= 0n) throw new Error('Amount must be greater than zero');
  return units;
}

/** Formats base units as a decimal string, dropping trailing fractional zeros. */
export function formatTokenAmount(units: bigint | string, decimals: number): string {
  const value = BigInt(units);
  const scale = 10n ** BigInt(decimals);
  const whole = value / scale;
  const fraction = decimals === 0 ? '' : (value % scale).toString().padStart(decimals, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

/** What the UI needs to show a token amount. */
export interface TokenInfo {
  decimals: number;
  symbol: string;
}

const tokenInfoCache = new Map<string, Promise<TokenInfo>>();
const SAVED_TOKEN_KEY = 'miden-tg-wallet:token:';

/**
 * Tokens this wallet knows without asking anyone: each network's fee token
 * (USDCX), until it is on the 0xMiden token list. The faucet's on-chain
 * storage map (`used_nonces`) has grown past what `getAccountDetails`
 * decodes in full, so the metadata read fails on testnet since October 2026
 * and every amount showed as raw units. This answers only when both the list
 * and the read fail, and only for these faucets: a wrong guess would
 * mis-scale every amount.
 */
const KNOWN_TOKENS: Partial<Record<MidenNetwork, Record<string, TokenInfo>>> = {
  testnet: { '0x4cbdcaffe75f0a317482224dae6436': { decimals: 6, symbol: 'USDCX' } },
  // Read from the chain on 2026-10-26 (rpc.cedar.miden.io): USDCX, 6 decimals.
  mainnet: { '0xe69e6ca6e39df1b10c1e5399399feb': { decimals: 6, symbol: 'USDCX' } },
};

export function knownTokenInfo(faucetId: string, network: MidenNetwork = MIDEN_NETWORK): TokenInfo | null {
  return KNOWN_TOKENS[network]?.[faucetId.trim().toLowerCase()] ?? null;
}

/**
 * Decimals and symbol this phone read before: a faucet's metadata does not
 * change, so amounts show at once on opening while getTokenInfo re-reads it.
 */
export function savedTokenInfo(faucetId: string): TokenInfo | null {
  try {
    const info = JSON.parse(storage.get(SAVED_TOKEN_KEY + faucetId.trim().toLowerCase()) ?? 'null') as TokenInfo | null;
    return info && typeof info.decimals === 'number' && typeof info.symbol === 'string' ? info : null;
  } catch {
    return null;
  }
}

/** Upper bound on the metadata lookup; the SDK's RPC transport has no deadline of its own. */
export const DECIMALS_LOOKUP_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error: unknown) => { clearTimeout(timer); reject(error); },
    );
  });
}

/** Where token details come from, in order: the token list, the chain, the known fee token. */
export interface TokenSource {
  listed(faucetIdHex: string): Promise<ListedToken | null>;
  chain(faucetIdHex: string): Promise<TokenInfo>;
  known(faucetIdHex: string): TokenInfo | null;
}

const tokenList = createTokenList({ network: MIDEN_NETWORK, toHex: toHexAccountId, store: storage });
const defaultSource: TokenSource = { listed: (id) => tokenList.listed(id), chain: fetchTokenInfo, known: knownTokenInfo };

/**
 * Decimals and symbol of a fungible faucet: from the 0xMiden token list when
 * the faucet is listed (the verified source, cheap to read), else from its
 * on-chain metadata without importing the faucet into the local store, else
 * the known fee token. Throws when none answers, so callers fail closed
 * instead of guessing. Cached per faucet; failures are not cached.
 */
export function getTokenInfo(
  faucetId: string,
  timeoutMs: number = DECIMALS_LOOKUP_TIMEOUT_MS,
  source: TokenSource = defaultSource,
): Promise<TokenInfo> {
  const key = faucetId.trim().toLowerCase();
  let pending = tokenInfoCache.get(key);
  if (!pending) {
    pending = (async () => {
      const listed = await source.listed(key).catch(() => null);
      if (listed) return { decimals: listed.decimals, symbol: listed.symbol };
      try {
        return await withTimeout(
          source.chain(key),
          timeoutMs,
          `Could not read token details for ${key}: the Miden node did not respond in time.`,
        );
      } catch (error) {
        const known = source.known(key);
        if (!known) throw error;
        console.warn(`Token details for ${key} could not be read; using the known ${known.symbol}`, error);
        return known;
      }
    })();
    tokenInfoCache.set(key, pending);
    // Do not cache failures: a transient RPC error must not stick.
    pending.then((info) => storage.set(SAVED_TOKEN_KEY + key, JSON.stringify(info)), () => tokenInfoCache.delete(key));
  }
  return pending;
}

export async function getFaucetDecimals(
  faucetId: string,
  timeoutMs: number = DECIMALS_LOOKUP_TIMEOUT_MS,
): Promise<number> {
  return (await getTokenInfo(faucetId, timeoutMs)).decimals;
}

async function fetchTokenInfo(faucetId: string): Promise<TokenInfo> {
  const rpc = new RpcClient(new Endpoint(MIDEN_RPC_URL));
  try {
    const fetched = await rpc.getAccountDetails(AccountId.fromHex(faucetId));
    const account = fetched.account();
    if (!account) throw new Error('faucet state is private');
    const faucet = BasicFungibleFaucetComponent.fromAccount(account);
    const decimals = faucet.decimals();
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
      throw new Error(`unexpected decimals ${decimals}`);
    }
    const symbol = faucet.symbol().toString().trim();
    return { decimals, symbol: symbol || shortFaucetId(faucetId) };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not read token details for ${faucetId}: ${reason}`);
  } finally {
    rpc.free();
  }
}

/** Fallback label when a token has no readable symbol: never a well-known name. */
export function shortFaucetId(faucetId: string): string {
  const id = faucetId.trim();
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

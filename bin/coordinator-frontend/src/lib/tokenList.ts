import mainnet from '@/config/tokenList/mainnet.json';
import testnet from '@/config/tokenList/testnet.json';
import { accountAddress } from './findAccounts';
import type { MidenNetwork } from './midenNetwork';

/**
 * Miden's verified token lists (github.com/0xMiden/token-list), shipped with
 * the app as the Miden Wallet ships them; scripts/update-token-list.mjs
 * refreshes the copy. Anyone can create a token with any name, symbol and
 * logo, so a token whose faucet is not listed for this network is marked
 * Unverified. The network's own fee token is always verified.
 */
export interface ListedToken {
  /** The faucet's Miden address, without routing parameters. */
  faucetId: string;
  symbol: string;
  name: string;
  decimals: number;
}

export type TokenVerification = 'verified' | 'unverified' | 'unknown';

type TokenListFile = { tokens: Array<{ faucetId: string; symbol: string; name: string; decimals: number }> };

const listed = (file: TokenListFile): ListedToken[] =>
  file.tokens.map(({ faucetId, symbol, name, decimals }) => ({ faucetId, symbol, name, decimals }));

/** A network without a list (devnet, local) marks nothing: not knowing is not evidence against a token. */
const LISTS: Partial<Record<MidenNetwork, ListedToken[]>> = {
  mainnet: listed(mainnet),
  testnet: listed(testnet),
};

export function hasTokenList(network: MidenNetwork): boolean {
  return LISTS[network] !== undefined;
}

/**
 * The listed token with this hex faucet ID on `network`, if any. Throws while
 * the Miden SDK is not ready to convert the ID, so a caller can tell "not
 * listed" from "not known yet".
 */
export function listedToken(faucetId: string, network: MidenNetwork): ListedToken | undefined {
  const list = LISTS[network];
  if (!list) return undefined;
  const address = accountAddress(faucetId, network);
  return list.find((token) => token.faucetId === address);
}

/** The verified token on `network` whose symbol another token uses, if any. */
export function imitatedToken(symbol: string, network: MidenNetwork): ListedToken | undefined {
  const wanted = symbol.trim().toLowerCase();
  return wanted ? LISTS[network]?.find((token) => token.symbol.toLowerCase() === wanted) : undefined;
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

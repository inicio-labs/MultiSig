'use client';

import { useEffect, useState } from 'react';
import { MIDEN_NETWORK } from '@/config/psm';
import { useTokenEnv } from '@/contexts/MultisigContext';
import { listedToken, tokenVerification, type ListedToken, type TokenVerification } from '@/lib/tokenList';
import { shortFaucetId, type TokenInfo } from '@/lib/tokenAmounts';
import { useTokenInfo } from './useTokenInfo';

export interface TokenView {
  /** The faucet's on-chain metadata (decimals, symbol); null while loading or unreadable. */
  info: TokenInfo | null;
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  /** The token's entry on Miden's verified list, if it has one. */
  listed?: ListedToken;
  verification: TokenVerification;
  /** The network's fee token. */
  isFeeToken: boolean;
  /** What people call it: the listed name, else the on-chain symbol. */
  name: string;
  /** The listed symbol, else the on-chain one; a short faucet ID only once it can't be read. */
  symbol: string;
}

/** A token as the app shows it: on-chain metadata plus Miden's verified list. */
export function useToken(faucetId: string): TokenView {
  // Both lookups need the Miden SDK, which is ready once the client is: until
  // then nothing is read (an early read would fail and not be retried).
  const { sdkReady, nativeFaucetId, tokenListRevision } = useTokenEnv();
  const token = useTokenInfo(sdkReady ? faucetId : '');
  // undefined until the lookup ran.
  const [listing, setListing] = useState<{ token?: ListedToken }>();

  useEffect(() => {
    if (!sdkReady) {
      setListing(undefined);
      return;
    }
    try {
      setListing({ token: listedToken(faucetId, MIDEN_NETWORK) });
    } catch {
      setListing(undefined);
    }
  }, [faucetId, sdkReady, tokenListRevision]);

  const listed = listing?.token;
  const onChainSymbol = token.status === 'ready' ? token.info.symbol : undefined;
  const symbol = listed?.symbol ?? onChainSymbol ?? (token.status === 'error' ? shortFaucetId(faucetId) : '…');
  return {
    info: token.info,
    status: token.status,
    error: token.error,
    listed,
    verification: tokenVerification(faucetId, MIDEN_NETWORK, listing, nativeFaucetId),
    isFeeToken: nativeFaucetId !== null && faucetId.toLowerCase() === nativeFaucetId,
    name: listed?.name ?? (token.status === 'error' ? 'Unknown token' : symbol),
    symbol,
  };
}

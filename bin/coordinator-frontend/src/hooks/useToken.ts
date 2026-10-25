'use client';

import { useEffect, useState } from 'react';
import { MIDEN_NETWORK } from '@/config/psm';
import { useMultisig } from '@/contexts/MultisigContext';
import { listedToken, tokenVerification, type ListedToken, type TokenVerification } from '@/lib/tokenList';
import { shortFaucetId, type TokenInfo } from '@/lib/tokenAmounts';
import { useTokenInfo } from './useTokenInfo';

let knownNativeFaucetId: string | null = null;

/**
 * The network's fee token (verified by definition), once the client knows it:
 * the SDK reports it after the store has synced, so a failure retries after
 * the next sync.
 */
export function useNativeFaucetId(): string | null {
  const { midenClient, syncingState } = useMultisig();
  const [nativeFaucetId, setNativeFaucetId] = useState(knownNativeFaucetId);

  useEffect(() => {
    if (!midenClient || nativeFaucetId) return;
    let cancelled = false;
    midenClient.feeFaucetId().then(
      (faucet) => {
        knownNativeFaucetId = faucet.toString().toLowerCase();
        faucet.free();
        if (!cancelled) setNativeFaucetId(knownNativeFaucetId);
      },
      () => { /* not synced yet: tried again after the next sync */ },
    );
    return () => { cancelled = true; };
  }, [midenClient, syncingState, nativeFaucetId]);

  return nativeFaucetId;
}

export interface TokenView {
  /** The faucet's on-chain metadata (decimals, symbol); null while loading or unreadable. */
  info: TokenInfo | null;
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  /** The token's entry on Miden's verified list, if it has one. */
  listed?: ListedToken;
  verification: TokenVerification;
  /** What people call it: the listed name, else the on-chain symbol. */
  name: string;
  /** The listed symbol, else the on-chain one, else a short faucet ID. */
  symbol: string;
}

/** A token as the app shows it: on-chain metadata plus Miden's verified list. */
export function useToken(faucetId: string): TokenView {
  // Both lookups need the Miden SDK, which is ready once the client is: until
  // then nothing is read (an early read would fail and not be retried).
  const { midenClient } = useMultisig();
  const sdkReady = midenClient !== null;
  const token = useTokenInfo(sdkReady ? faucetId : '');
  const nativeFaucetId = useNativeFaucetId();
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
  }, [faucetId, sdkReady]);

  const listed = listing?.token;
  const onChainSymbol = token.status === 'ready' ? token.info.symbol : undefined;
  const symbol = listed?.symbol ?? onChainSymbol ?? shortFaucetId(faucetId);
  return {
    info: token.info,
    status: token.status,
    error: token.error,
    listed,
    verification: tokenVerification(faucetId, MIDEN_NETWORK, listing, nativeFaucetId),
    name: listed?.name ?? (token.status === 'error' ? 'Unknown token' : symbol),
    symbol,
  };
}

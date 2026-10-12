'use client';

import { useEffect, useState } from 'react';
import { getTokenInfo, savedTokenInfo, type TokenInfo } from '@/lib/tokenAmounts';

export type TokenInfoState =
  | { status: 'loading'; info: null; error: null }
  | { status: 'ready'; info: TokenInfo; error: null }
  | { status: 'error'; info: null; error: string };

// Known at once when this phone read it before (savedTokenInfo).
function initial(faucetId: string): TokenInfoState {
  const saved = savedTokenInfo(faucetId);
  return saved ? { status: 'ready', info: saved, error: null } : { status: 'loading', info: null, error: null };
}

/** A faucet's decimals and symbol from its on-chain metadata. */
export function useTokenInfo(faucetId: string): TokenInfoState {
  const [state, setState] = useState<TokenInfoState>(() => initial(faucetId));

  useEffect(() => {
    let cancelled = false;
    setState(initial(faucetId));
    getTokenInfo(faucetId).then(
      (info) => { if (!cancelled) setState({ status: 'ready', info, error: null }); },
      (err: unknown) => {
        if (!cancelled) setState({ status: 'error', info: null, error: err instanceof Error ? err.message : String(err) });
      },
    );
    return () => { cancelled = true; };
  }, [faucetId]);

  return state;
}

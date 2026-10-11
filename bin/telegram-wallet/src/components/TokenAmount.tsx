'use client';

import { useTokenInfo } from '@/hooks/useTokenInfo';
import { formatTokenAmount, shortFaucetId } from '@/lib/tokenAmounts';

/** A token amount in its own units and symbol, read from the faucet's metadata. */
export function TokenAmount({ faucetId, amount, className }: { faucetId: string; amount: bigint; className?: string }) {
  const token = useTokenInfo(faucetId);
  if (token.status !== 'ready') {
    return <span className={className}>{token.status === 'loading' ? '…' : `${amount} units of ${shortFaucetId(faucetId)}`}</span>;
  }
  return <span className={className}>{formatTokenAmount(amount, token.info.decimals)} {token.info.symbol}</span>;
}

export function TokenSymbol({ faucetId }: { faucetId: string }) {
  const token = useTokenInfo(faucetId);
  return <>{token.status === 'ready' ? token.info.symbol : shortFaucetId(faucetId)}</>;
}

/** The hero balance: big number, smaller symbol. */
export function BigAmount({ faucetId, amount }: { faucetId: string; amount: bigint }) {
  const token = useTokenInfo(faucetId);
  if (token.status !== 'ready') return <span className="shim" />;
  return <>{formatTokenAmount(amount, token.info.decimals)} <small>{token.info.symbol}</small></>;
}

'use client';

import { useTokenInfo } from '@/hooks/useTokenInfo';
import { accountAddress, shortAddress } from '@/lib/address';
import { feeLabel } from '@/lib/fees';
import type { ActivityItem } from '@/lib/walletEngine';
import { Icon } from './Icon';
import { TokenAmount } from './TokenAmount';

function who(item: ActivityItem): string {
  if (!item.counterparty) return when(item.timestamp);
  try {
    return `${item.direction === 'in' ? 'from' : 'to'} ${shortAddress(accountAddress(item.counterparty))}`;
  } catch {
    return when(item.timestamp);
  }
}

function when(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date().toDateString() === date.toDateString();
  return today
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export function ActivityList({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return <div className="empty">Your payments show up here.</div>;
  return (
    <>
      {items.map((item) => (
        <div key={item.id} className="cell">
          <span className="avatar"><Icon name={item.direction === 'in' ? 'receive' : 'send'} /></span>
          <span className="cell-main">
            <span className="cell-title">{item.direction === 'in' ? 'Received' : 'Sent'}</span>
            <span className="cell-sub">{who(item)}{item.fee && <Fee fee={item.fee} />}</span>
          </span>
          <span className={`cell-value amount-value${item.direction === 'in' ? ' in' : ''}`}>
            {item.direction === 'in' ? '+' : '−'}
            <TokenAmount faucetId={item.faucetId} amount={item.amount} />
          </span>
        </div>
      ))}
    </>
  );
}

/** " · fee under 1¢": what the transaction cost. */
function Fee({ fee }: { fee: NonNullable<ActivityItem['fee']> }) {
  const token = useTokenInfo(fee.faucetId);
  if (token.status !== 'ready') return null;
  return <> · fee {feeLabel(fee.amount, token.info.decimals, token.info.symbol)}</>;
}

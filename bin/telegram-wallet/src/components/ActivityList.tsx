'use client';

import { useEffect, useRef } from 'react';
import { useToday } from '@/hooks/useToday';
import { groupByDay, timeOfDay } from '@/lib/activityDays';
import { accountAddress, shortAddress } from '@/lib/address';
import { contactFor, contactLabel, type Contacts } from '@/lib/contacts';
import type { ActivityItem } from '@/lib/walletEngine';
import { Icon } from './Icon';
import { TokenAmount } from './TokenAmount';

export function who(item: ActivityItem, contacts: Contacts = {}): string {
  if (!item.counterparty) return 'Private payment';
  const direction = item.direction === 'in' ? 'from' : 'to';
  // Paid by Telegram name before: the name, not the address.
  const contact = contactFor(contacts, item.counterparty);
  if (contact) return `${direction} ${contactLabel(contact)}`;
  try {
    return `${direction} ${shortAddress(accountAddress(item.counterparty))}`;
  } catch {
    return 'Private payment';
  }
}

export const timeOf = (item: ActivityItem): number => Date.parse(item.timestamp);

/**
 * Payments by day, Telegram style: a header ("Today", "Yesterday", "Mon,
 * 6 Oct") over a card of that day's payments, each with its local time under
 * the amount. Times stay visible when amounts are hidden.
 */
export function ActivityList({ items, loading = false, contacts = {} }: { items: ActivityItem[]; loading?: boolean; contacts?: Contacts }) {
  const today = useToday();
  // Rows already there on the first render (the saved view) do not fade in;
  // payments that arrive later do.
  const seen = useRef<Set<string> | null>(null);
  seen.current ??= new Set(items.map((item) => item.id));
  useEffect(() => { for (const item of items) seen.current?.add(item.id); });

  if (items.length === 0 && loading) {
    // First open on this phone: placeholders until the history arrives.
    return (
      <div className="cells">
        {[0, 1].map((i) => (
          <div key={i} className="cell" aria-hidden>
            <span className="avatar skeleton" />
            <span className="cell-main"><span className="shim" /><span className="shim short" /></span>
          </div>
        ))}
      </div>
    );
  }
  if (items.length === 0) return <div className="cells"><div className="empty">Your payments show up here.</div></div>;
  return (
    <>
      {groupByDay(items, timeOf, today).map((day) => (
        <section key={day.label} aria-label={day.label}>
          <h2 className="day-head">{day.label}</h2>
          <div className="cells">
            {day.items.map((item) => (
              <div key={item.id} className={`cell${seen.current?.has(item.id) ? '' : ' row-in'}`}>
                <span className="avatar"><Icon name={item.direction === 'in' ? 'receive' : 'send'} /></span>
                <span className="cell-main">
                  <span className="cell-title">{item.direction === 'in' ? 'Received' : 'Sent'}</span>
                  <span className="cell-sub">{who(item, contacts)}</span>
                </span>
                <span className="cell-end">
                  <span className={`cell-value amount-value${item.direction === 'in' ? ' in' : ''}`}>
                    {item.direction === 'in' ? '+' : '−'}
                    <TokenAmount faucetId={item.faucetId} amount={item.amount} />
                  </span>
                  <span className="cell-time">{timeOfDay(timeOf(item))}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

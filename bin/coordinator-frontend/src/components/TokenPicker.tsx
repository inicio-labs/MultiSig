'use client';

import { useEffect, useRef, useState } from 'react';
import { TokenLogo, UnverifiedTag } from '@/components/TokenAmount';
import { useToken } from '@/hooks/useToken';
import { formatTokenAmount } from '@/lib/tokenAmounts';

export interface TokenBalance {
  faucetId: string;
  amount: bigint;
}

/** A token's logo, name, symbol, Unverified tag and balance. */
function TokenRow({ faucetId, amount }: TokenBalance) {
  const token = useToken(faucetId);
  return (
    <>
      <TokenLogo token={token} size={26} />
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[12.5px] font-[500] text-[#111]">{token.name}</span>
          {token.verification === 'unverified' && <UnverifiedTag />}
        </span>
        <span className="text-[11px] text-[rgba(0,0,0,0.45)]">{token.symbol}</span>
      </span>
      <span className="shrink-0 text-[11.5px] tabular-nums text-[rgba(0,0,0,0.6)]">
        {token.info ? formatTokenAmount(amount, token.info.decimals) : '…'}
      </span>
    </>
  );
}

/**
 * Picks one of the account's tokens by name and logo, with each token's
 * balance and, when Miden's verified list does not vouch for it, its
 * Unverified tag. The list opens below the button, inside the form.
 */
export function TokenPicker({ balances, value, onChange }: {
  balances: TokenBalance[];
  value: string;
  onChange: (faucetId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const selected = balances.find((balance) => balance.faucetId === value);

  return (
    <div ref={root} className="flex flex-col gap-1">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className="flex min-h-10 w-full items-center gap-2.5 rounded-[8px] border border-[rgba(0,0,0,0.08)] bg-white px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-[#FF5500]"
      >
        {selected ? (
          <TokenRow faucetId={selected.faucetId} amount={selected.amount} />
        ) : (
          <span className="flex-1 text-left text-[12px] text-[rgba(0,0,0,0.4)]">Select token…</span>
        )}
        <svg className={`h-4 w-4 shrink-0 text-[rgba(0,0,0,0.4)] transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul role="listbox" aria-label="Tokens" className="max-h-60 overflow-y-auto rounded-[8px] border border-[rgba(0,0,0,0.08)] bg-white p-1 shadow-sm">
          {balances.length === 0 && (
            <li className="px-2 py-2 text-[12px] text-[rgba(0,0,0,0.45)]">No tokens in this account</li>
          )}
          {balances.map((balance) => (
            <li key={balance.faucetId} role="option" aria-selected={balance.faucetId === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(balance.faucetId);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-[6px] px-2 py-1.5 transition-colors hover:bg-[rgba(0,0,0,0.03)] ${balance.faucetId === value ? 'bg-[#FF5500]/5' : ''}`}
              >
                <TokenRow faucetId={balance.faucetId} amount={balance.amount} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { TokenLogo } from '@/components/TokenAmount';
import { useToken } from '@/hooks/useToken';
import { formatTokenAmount } from '@/lib/tokenAmounts';

export interface TokenBalance {
  faucetId: string;
  amount: bigint;
}

/** A token's logo, name, symbol and balance. */
function TokenRow({ faucetId, amount }: TokenBalance) {
  const token = useToken(faucetId);
  return (
    <>
      <TokenLogo token={token} size={26} />
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span className="truncate text-[12.5px] font-[500] text-[#111]">{token.name}</span>
        <span className="text-[11px] text-[rgba(0,0,0,0.45)]">{token.symbol}</span>
      </span>
      <span className="shrink-0 text-[11.5px] tabular-nums text-[rgba(0,0,0,0.6)]">
        {token.info ? formatTokenAmount(amount, token.info.decimals) : '…'}
      </span>
    </>
  );
}

/**
 * Picks one of the tokens Send offers (see sendableTokens) by name and logo,
 * with each one's balance. The list opens below the button, inside the form;
 * arrow keys move through it and Escape closes it.
 */
export function TokenPicker({ balances, pending, value, onChange }: {
  balances: TokenBalance[];
  /** Some tokens are still being checked. */
  pending: boolean;
  value: string;
  onChange: (faucetId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const options = () => Array.from(list.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const all = options();
    (all.find((option) => option.getAttribute('aria-selected') === 'true') ?? all[0])?.focus();
    const outside = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const move = (event: ReactKeyboardEvent<HTMLUListElement>) => {
    const all = options();
    const at = all.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === 'ArrowDown' ? Math.min(at + 1, all.length - 1)
      : event.key === 'ArrowUp' ? Math.max(at - 1, 0)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? all.length - 1
      : null;
    if (next === null) return;
    event.preventDefault();
    all[next]?.focus();
  };

  const selected = balances.find((balance) => balance.faucetId === value);

  return (
    <div ref={root} className="flex flex-col gap-1">
      <button
        ref={trigger}
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
        <ul
          ref={list}
          role="listbox"
          aria-label="Tokens"
          onKeyDown={move}
          className="max-h-60 overflow-y-auto rounded-[8px] border border-[rgba(0,0,0,0.08)] bg-white p-1 shadow-sm"
        >
          {balances.map((balance) => (
            <li key={balance.faucetId} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={balance.faucetId === value}
                onClick={() => {
                  onChange(balance.faucetId);
                  close(true);
                }}
                className={`flex w-full items-center gap-2.5 rounded-[6px] px-2 py-1.5 transition-colors hover:bg-[rgba(0,0,0,0.03)] focus:bg-[rgba(0,0,0,0.04)] focus:outline-hidden ${balance.faucetId === value ? 'bg-[#FF5500]/5' : ''}`}
              >
                <TokenRow faucetId={balance.faucetId} amount={balance.amount} />
              </button>
            </li>
          ))}
          {pending && (
            <li role="presentation" className="px-2 py-2 text-[12px] text-[rgba(0,0,0,0.45)]">Loading tokens…</li>
          )}
          {!pending && balances.length === 0 && (
            <li role="presentation" className="px-2 py-2 text-[12px] text-[rgba(0,0,0,0.45)]">No tokens to send</li>
          )}
        </ul>
      )}
    </div>
  );
}

"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { TokenLogo, UNVERIFIED_WHY } from "@/components/TokenAmount";
import { MIDEN_NETWORK } from "@/config/psm";
import { useTokenEnv } from "@/contexts/MultisigContext";
import { useToken } from "@/hooks/useToken";
import { accountAddress } from "@/lib/findAccounts";
import { formatTokenAmount } from "@/lib/tokenAmounts";
import { holdingsOrder } from "@/lib/tokenList";

export interface HeldToken {
  faucetId: string;
  amount: bigint;
}

const ROW = "flex h-14 items-center gap-2.5 px-3 md:h-[60px] md:gap-3 md:px-5";
/** The text column: every row but the first has a divider, inset past the logo. */
const body = (first: boolean) =>
  `flex h-full min-w-0 flex-1 items-center gap-2.5 md:gap-3 ${first ? "" : "border-t border-[rgba(0,0,0,0.06)]"}`;

/** Copies the token's Miden address. With a mouse it shows on row hover; on touch it is always there. */
function CopyAddress({ faucetId }: { faucetId: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(accountAddress(faucetId, MIDEN_NETWORK));
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy the address");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy token address"
      aria-label="Copy token address"
      className={`-ml-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-[6px] text-[rgba(0,0,0,0.35)] transition-opacity hover:bg-[rgba(0,0,0,0.05)] hover:text-[rgba(0,0,0,0.75)] focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-[#FF5500]/50 active:bg-[rgba(0,0,0,0.08)] md:-ml-1 ${copied ? "" : "pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100"}`}
    >
      {copied ? (
        <svg className="h-3.5 w-3.5 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden>
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V5a2 2 0 012-2h10" />
        </svg>
      )}
      <span className="sr-only" aria-live="polite">{copied ? "Address copied" : ""}</span>
    </button>
  );
}

function SkeletonRow({ first }: { first: boolean }) {
  return (
    <li aria-hidden className={ROW}>
      <span className="size-7 shrink-0 animate-pulse rounded-full bg-[rgba(0,0,0,0.06)] md:size-8" />
      <div className={`${body(first)} justify-between`}>
        <span className="h-2.5 w-28 animate-pulse rounded-full bg-[rgba(0,0,0,0.06)]" />
        {/* Ends where the amounts do: the copy button's slot stays free. */}
        <span className="mr-[34px] h-2.5 w-16 animate-pulse rounded-full bg-[rgba(0,0,0,0.06)] md:mr-[38px]" />
      </div>
    </li>
  );
}

/** One token: on the left what it is, on the right how much; its symbol only by the amount. */
function AssetRow({ faucetId, amount, first }: HeldToken & { first: boolean }) {
  const token = useToken(faucetId);
  if (token.status === "loading" && !token.listed) return <SkeletonRow first={first} />;

  const unreadable = token.status === "error";
  const unverified = !unreadable && token.verification === "unverified";
  // A listed token by its name; the fee token and tokens on a network without a
  // list by their symbol; an unverified one never by its self-chosen name.
  const label = token.listed?.name ?? (unreadable ? "Unknown token" : unverified ? "Unverified token" : token.symbol);
  const why = unreadable ? "This token's details couldn't be read." : unverified ? UNVERIFIED_WHY : undefined;
  const number = unreadable
    ? BigInt(amount).toLocaleString("en-US")
    : token.info ? formatTokenAmount(amount, token.info.decimals, { grouped: true }) : "…";
  const unit = unreadable ? "base units" : token.symbol;

  return (
    <li className={`group ${ROW}`}>
      <TokenLogo token={token} size={32} sizeClass="size-7 text-[12px] md:size-8 md:text-[13px]" />
      <div className={body(first)}>
        <span
          title={why}
          className={`min-w-0 flex-1 truncate text-[13px] font-[500] md:text-[14px] ${unreadable || unverified ? "text-[rgba(0,0,0,0.5)]" : "text-[#111]"}`}
        >
          {label}
        </span>
        <span className="max-w-[60%] shrink-0 break-all text-right text-[13px] tabular-nums md:text-[14px]">
          <span className="font-[600] text-[#111]">{number}</span>
          {/* The unit stays with the number and is never split. */}
          <span className="whitespace-nowrap break-normal font-[500] text-[rgba(0,0,0,0.45)]">{" "}{unit}</span>
        </span>
        <CopyAddress faucetId={faucetId} />
      </div>
    </li>
  );
}

/**
 * The account's tokens in one list: the fee token, then listed tokens by name,
 * then the rest; zero balances left out. Placeholder rows while the account loads.
 */
const TokenHoldings = ({ balances, loading }: { balances: readonly HeldToken[]; loading: boolean }) => {
  const { sdkReady, nativeFaucetId, tokenListRevision } = useTokenEnv();
  const ordered = useMemo(() => {
    try {
      return holdingsOrder(balances, MIDEN_NETWORK, nativeFaucetId);
    } catch {
      return balances.filter((balance) => balance.amount > 0n);
    }
    // sdkReady and tokenListRevision: listedToken can answer, or answers differently.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balances, nativeFaucetId, sdkReady, tokenListRevision]);

  // The fee token goes first, so the rows wait for it (remembered after the
  // first visit) rather than appear and then move; at most 5 s.
  const [waitedForFeeToken, setWaitedForFeeToken] = useState(false);
  useEffect(() => {
    if (nativeFaucetId) return;
    const timer = setTimeout(() => setWaitedForFeeToken(true), 5000);
    return () => clearTimeout(timer);
  }, [nativeFaucetId]);
  const placeholders = loading || (!nativeFaucetId && !waitedForFeeToken);

  return (
    <div className="rounded-[10px] border border-[rgba(0,0,0,0.08)] bg-white">
      {placeholders ? (
        <ul>
          {[0, 1, 2].map((i) => <SkeletonRow key={i} first={i === 0} />)}
        </ul>
      ) : ordered.length === 0 ? (
        <div className="grid h-[120px] place-items-center text-[13px] text-[rgba(0,0,0,0.45)]">No tokens yet</div>
      ) : (
        <ul role="list">
          {ordered.map((balance, i) => (
            <AssetRow key={balance.faucetId} faucetId={balance.faucetId} amount={balance.amount} first={i === 0} />
          ))}
        </ul>
      )}
    </div>
  );
};

export default TokenHoldings;

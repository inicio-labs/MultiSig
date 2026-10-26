"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TokenAmount } from "@/components/TokenAmount";
import { MIDEN_NETWORK } from "@/config/psm";
import { useTokenEnv } from "@/contexts/MultisigContext";
import type { TransactionHistoryState } from "@/hooks/useTransactionHistory";
import { accountAddress } from "@/lib/findAccounts";
import { shortHex } from "@/lib/proposalDescription";
import {
  describeHistoryEntry,
  historyTime,
  historyTimeFull,
  settingsDetail,
  settingsTitle,
  soleCounterparty,
  sortHistory,
  totalsByToken,
  type HistoryItem,
  type HistoryKind,
  type Movement,
} from "@/lib/transactionHistory";

const PREVIEW_ROWS = 5;
const ROW = "flex min-h-14 items-center gap-2.5 px-3 py-2 md:min-h-[60px] md:gap-3 md:px-5";
const BUTTON = "inline-flex h-8 items-center rounded-[8px] border border-[rgba(0,0,0,0.08)] bg-white px-3 text-[12px] font-[500] text-[#111] transition-colors hover:bg-gray-50 active:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40";

const TITLES: Record<Exclude<HistoryKind, "settings">, string> = {
  sent: "Sent",
  received: "Received",
  swap: "Swap",
  other: "Transaction",
};

function KindIcon({ kind }: { kind: HistoryKind }) {
  const path = {
    sent: "M7 17L17 7M9 7h8v8",
    received: "M17 7L7 17M15 17H7V9",
    swap: "M7 7h11l-3-3M17 17H6l3 3",
    settings: "M4 7h10M18 7h2M4 17h4M12 17h8M14 5v4M8 15v4",
    other: "M5 12h14",
  }[kind];
  return (
    <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-[rgba(0,0,0,0.05)] text-[rgba(0,0,0,0.6)] md:size-8">
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d={path} />
      </svg>
    </span>
  );
}

/** A Miden address, shortened; the full one on hover. */
function Account({ id, sdkReady }: { id: string; sdkReady: boolean }) {
  let address = id;
  if (sdkReady) {
    try {
      address = accountAddress(id, MIDEN_NETWORK);
    } catch {
      // Shown as the hex ID.
    }
  }
  return <span className="break-all font-mono" title={address}>{shortHex(address, 10, 6)}</span>;
}

function Amounts({ moves, sign = "" }: { moves: readonly Movement[]; sign?: "+" | "−" | "" }) {
  return (
    <>
      {totalsByToken(moves).map((total, i) => (
        <span key={total.faucetId} className="whitespace-nowrap">
          {i > 0 && ", "}
          {sign}
          <TokenAmount faucetId={total.faucetId} amount={total.amount} />
        </span>
      ))}
    </>
  );
}

function HistoryRow({ item, first, title, detail, sdkReady }: {
  item: HistoryItem;
  first: boolean;
  title: string;
  detail?: string;
  sdkReady: boolean;
}) {
  const to = soleCounterparty(item.sent);
  const from = soleCounterparty(item.received);
  const parties = item.kind === "sent"
    ? (to ? <>to <Account id={to} sdkReady={sdkReady} /></> : item.sent.length > 1 ? "to several accounts" : null)
    : item.kind === "received"
      ? (from ? <>from <Account id={from} sdkReady={sdkReady} /></> : null)
      : detail ?? null;

  return (
    <li className={ROW}>
      <KindIcon kind={item.kind} />
      <div className={`flex min-w-0 flex-1 items-center gap-3 self-stretch ${first ? "" : "border-t border-[rgba(0,0,0,0.06)]"}`}>
        <div className="min-w-0 flex-1 py-1">
          <div className="text-[13px] font-[500] text-[#111] md:text-[14px]">{title}</div>
          {/* Who, then when (and on phones the fee): wrapped onto lines rather than cut off. */}
          <div className="flex flex-wrap gap-x-1.5 text-[12px] text-[rgba(0,0,0,0.5)]">
            {parties && <span className="min-w-0 basis-full sm:basis-auto">{parties}</span>}
            {parties && item.at !== null && <span aria-hidden className="hidden sm:inline">·</span>}
            {item.at !== null && <span className="whitespace-nowrap" title={historyTimeFull(item.at)}>{historyTime(item.at)}</span>}
            {item.fees.length > 0 && <span className="whitespace-nowrap sm:hidden">Fee <Amounts moves={item.fees} /></span>}
          </div>
        </div>
        <div className="max-w-[50%] shrink-0 py-1 text-right text-[13px] tabular-nums md:text-[14px]">
          <div className="font-[600] text-[#111]">
            {item.undecoded ? (
              <span className="whitespace-nowrap font-[400] text-[rgba(0,0,0,0.45)]">Details unavailable</span>
            ) : (
              <>
                {item.received.length > 0 && <Amounts moves={item.received} sign="+" />}
                {item.received.length > 0 && item.sent.length > 0 && <br />}
                {item.sent.length > 0 && <Amounts moves={item.sent} sign="−" />}
              </>
            )}
          </div>
          {item.fees.length > 0 && (
            <div className="hidden whitespace-nowrap text-[11px] text-[rgba(0,0,0,0.45)] sm:block">
              Fee <Amounts moves={item.fees} />
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function SkeletonRows() {
  return (
    <ul aria-hidden>
      {[0, 1, 2].map((i) => (
        <li key={i} className={ROW}>
          <span className="size-7 shrink-0 animate-pulse rounded-full bg-[rgba(0,0,0,0.06)] md:size-8" />
          <div className={`flex h-full flex-1 items-center justify-between ${i === 0 ? "" : "border-t border-[rgba(0,0,0,0.06)]"}`}>
            <span className="h-2.5 w-32 animate-pulse rounded-full bg-[rgba(0,0,0,0.06)]" />
            <span className="h-2.5 w-16 animate-pulse rounded-full bg-[rgba(0,0,0,0.06)]" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * The account's executed transactions, newest first, from Guardian's history
 * (the page reads it with useTransactionHistory). `preview` shows the latest
 * few with a link to the full list.
 */
const TransactionHistory: React.FC<{ history: TransactionHistoryState; preview?: boolean }> = ({ history, preview = false }) => {
  const { sdkReady, nativeFaucetId } = useTokenEnv();
  const { accountId } = history;

  // The fee note is told apart by the fee token, so rows wait for it
  // (remembered after the first visit); at most 5 s.
  const [waitedForFeeToken, setWaitedForFeeToken] = useState(false);
  useEffect(() => {
    if (nativeFaucetId) return;
    const timer = setTimeout(() => setWaitedForFeeToken(true), 5000);
    return () => clearTimeout(timer);
  }, [nativeFaucetId]);

  const items = useMemo(
    () => (accountId ? sortHistory(history.entries).map((entry) => describeHistoryEntry(entry, accountId, nativeFaucetId)) : []),
    [history.entries, accountId, nativeFaucetId],
  );
  const shown = preview ? items.slice(0, PREVIEW_ROWS) : items;
  const waiting = !nativeFaucetId && !waitedForFeeToken;

  let body: React.ReactNode;
  if (history.status === "approval") {
    body = (
      <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
        <p className="max-w-[360px] text-[13px] text-[rgba(0,0,0,0.55)]">
          There is no Guardian session, so reading the history asks your wallet to sign.
        </p>
        <button type="button" onClick={() => void history.load()} className={BUTTON}>Show history</button>
      </div>
    );
  } else if (history.status === "error" && items.length === 0) {
    body = (
      <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
        <p role="alert" className="max-w-[420px] break-words text-[13px] text-red-700">{history.error}</p>
        <button type="button" onClick={() => void history.load()} className={BUTTON}>Try again</button>
      </div>
    );
  } else if (items.length === 0 && history.status === "ready") {
    body = <div className="grid h-[120px] place-items-center text-[13px] text-[rgba(0,0,0,0.45)]">No transactions yet</div>;
  } else if (items.length === 0 || waiting) {
    body = <SkeletonRows />;
  } else {
    body = (
      <ul role="list">
        {shown.map((item, i) => {
          const metadata = item.kind === "settings" ? history.metadataFor(item.key) : undefined;
          return (
            <HistoryRow
              key={item.key}
              item={item}
              first={i === 0}
              title={item.kind === "settings" ? settingsTitle(metadata) : TITLES[item.kind]}
              detail={item.kind === "settings" ? settingsDetail(metadata) : undefined}
              sdkReady={sdkReady}
            />
          );
        })}
      </ul>
    );
  }

  const more = preview ? items.length > PREVIEW_ROWS || history.hasMore : history.hasMore;

  return (
    <section className="flex w-full flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[16px] font-[500] text-[#00000099]">History</h2>
        <div className="flex items-center gap-2">
          {history.stale && history.asksWallet && history.status !== "loading" && (
            <button type="button" onClick={() => void history.load()} className={BUTTON}>Refresh</button>
          )}
          {preview && more && (
            <Link href="/dashboard/transactions" className="text-[12px] font-[500] text-[#111] hover:text-[#FF5500]">
              View all
            </Link>
          )}
        </div>
      </div>
      <div className="rounded-[10px] border border-[rgba(0,0,0,0.08)] bg-white">{body}</div>
      {!preview && history.status === "error" && items.length > 0 && (
        <p role="alert" className="text-[12px] text-red-700">{history.error}</p>
      )}
      {!preview && history.hasMore && items.length > 0 && (
        <div className="flex justify-center">
          <button type="button" disabled={history.status === "loading"} onClick={() => void history.loadMore()} className={BUTTON}>
            {history.status === "loading" ? "Loading…" : "Show more"}
          </button>
        </div>
      )}
    </section>
  );
};

export default TransactionHistory;

"use client";
import React, { useMemo } from "react";
import Image from "next/image";
import media from "../../../../public/media";
import PendingActions from "../components/PendingActions";
import TransactionHistory from "../components/TransactionHistory";
import { useMultisig } from "@/contexts/MultisigContext";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { getProposalActionState, proposalStage } from "@/lib/proposalActions";

// Force dynamic rendering to avoid WASM loading issues during build
export const dynamic = 'force-dynamic';

function StatCard({ icon, label, value, note }: { icon: typeof media.totalTransactionsIcon; label: string; value: string; note: string }) {
  return (
    <div className="lg:col-span-4 flex flex-col justify-between rounded-[10px] border border-[rgba(0,0,0,0.08)] p-4 md:p-5 h-[140px] md:h-[160px]">
      <div className="flex items-center gap-2">
        <div className="bg-[#FF5500]/10 rounded-[8px] w-7 h-7 flex items-center justify-center shrink-0">
          <Image src={icon} alt="" quality={100} width={16} height={16} />
        </div>
        <div className="text-[13px] font-[500] text-[rgba(0,0,0,0.5)]">{label}</div>
      </div>
      <div className="mt-auto">
        <div className="text-[28px] md:text-[32px] font-[600] text-[#111] tabular-nums">{value}</div>
        <div className="text-[12px] font-[400] text-[rgba(0,0,0,0.45)]">{note}</div>
      </div>
    </div>
  );
}

// Guardian forgets a proposal once it is executed, so executed transactions
// come from its history, and the proposals counted here are the open ones.
const Transactions: React.FC = () => {
  const { proposals, detectedConfig, activeCommitment, accountNonce } = useMultisig();
  const history = useTransactionHistory();

  const threshold = detectedConfig?.threshold ?? 0;

  const open = useMemo(() => {
    const counts = { waiting: 0, ready: 0, stale: 0, done: 0 };
    for (const proposal of proposals) {
      const state = getProposalActionState(proposal, detectedConfig, activeCommitment, threshold, accountNonce);
      counts[proposalStage(proposal, state)]++;
    }
    return counts;
  }, [proposals, detectedConfig, activeCommitment, threshold, accountNonce]);

  const executed = history.status === "ready" || history.entries.length > 0
    ? `${history.entries.length}${history.hasMore ? "+" : ""}`
    : "—";
  const executedNote = history.status === "approval"
    ? "Show the history below"
    : history.status === "error" && history.entries.length === 0
      ? "Couldn't load the history"
      : history.status === "loading" && history.entries.length === 0
        ? "Loading…"
        : "Transactions on this account";

  return (
    <div className="flex flex-col p-4 w-full">
      {/* Heading */}
      <div className="mb-4">
        <div className="text-[22px] md:text-[24px] font-[600] text-[#111]">
          Transactions
        </div>
        <div className="text-[13px] font-[500] text-[rgba(0,0,0,0.5)]">
          Proposals waiting on cosigners, and everything this account has executed
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-6 mb-6">
        <StatCard
          icon={media.thisMonthIcon}
          label="Waiting for signatures"
          value={String(open.waiting)}
          note={open.stale > 0 ? `${open.stale} outdated or invalid not counted` : "Proposals that need signatures"}
        />
        <StatCard
          icon={media.assetValIcon}
          label="Ready to execute"
          value={String(open.ready)}
          note="Signed by enough cosigners"
        />
        <StatCard
          icon={media.totalTransactionsIcon}
          label="Executed"
          value={executed}
          note={executedNote}
        />
      </div>

      {/* Pending Actions */}
      <div className="mb-6">
        <PendingActions threshold={threshold} fixedHeight={false} />
      </div>

      <TransactionHistory history={history} />
    </div>
  );
};

export default Transactions;

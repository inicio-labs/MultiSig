"use client";

import React, { useMemo } from "react";
import TokenHoldings from "./components/TokenHoldings";
import { useMultisig } from "@/contexts/MultisigContext";
import { useDashboardUI } from "@/contexts/DashboardUIContext";
import { useWaitingNotes } from "@/hooks/useWaitingNotes";

// Force dynamic rendering to avoid WASM loading issues during build
export const dynamic = 'force-dynamic';

const ACTION = "inline-flex h-9 items-center rounded-[8px] border border-[rgba(0,0,0,0.08)] bg-white px-3.5 text-[13px] font-[500] text-[#111] transition-colors hover:bg-gray-50 active:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40";

// Different tokens are never added together or compared as shares: each has
// its own decimals and value, so the page is the list of what the account holds.
const Assets = () => {
  const { detectedConfig, lastKnownAccount } = useMultisig();
  const { openSendModal, openReceiveModal } = useDashboardUI();
  const waiting = useWaitingNotes().length;
  const loaded = detectedConfig !== null;
  // Until the fresh state arrives, what this browser last knew (else placeholders).
  const shown = detectedConfig?.vaultBalances ?? lastKnownAccount?.vaultBalances;

  const balances = useMemo(() => shown ?? [], [shown]);

  return (
    // The same width and padding as Home, so the pages line up.
    <div className="flex h-full w-full flex-col px-2 py-2 md:py-3 lg:p-4">
      <div className="mb-4 flex items-center justify-between gap-3 md:mb-5">
        <h1 className="flex items-baseline gap-2 text-[22px] font-[600] leading-[1.2] text-[#111] md:text-[24px]">
          Assets
          {!loaded && shown && <span className="text-[12px] font-[400] text-[rgba(0,0,0,0.45)]">Updating…</span>}
        </h1>
        <div className="flex gap-2">
          <button type="button" disabled={!loaded} onClick={() => openSendModal()} className={ACTION}>
            Send
          </button>
          <button
            type="button"
            disabled={!loaded}
            onClick={() => openReceiveModal()}
            aria-label={waiting ? `Receive, ${waiting} ${waiting === 1 ? "note" : "notes"} waiting` : undefined}
            className={ACTION}
          >
            Receive
            {waiting > 0 && (
              <span className="ml-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#FF5500]/10 px-1 text-[11px] font-[600] tabular-nums text-[#FF5500]">
                {waiting > 9 ? "9+" : waiting}
              </span>
            )}
          </button>
        </div>
      </div>

      <TokenHoldings balances={balances} loading={!shown} />
    </div>
  );
};

export default Assets;

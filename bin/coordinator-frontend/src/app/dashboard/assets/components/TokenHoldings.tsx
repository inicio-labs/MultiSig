"use client";
import { TokenAmount, TokenLogo, UnverifiedTag } from "@/components/TokenAmount";
import React, { useEffect, useRef, useState } from "react";
import { MIDEN_NETWORK } from "@/config/psm";
import { useToken } from "@/hooks/useToken";
import { accountAddress } from "@/lib/findAccounts";

import { TokenHoldingsProps } from "@/types";

/** One token: its logo, name and symbol, and the balance; the address only behind the copy button. */
function HoldingRow({ faucetId, balance }: { faucetId: string; balance: string | bigint }) {
  const token = useToken(faucetId);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(accountAddress(faucetId, MIDEN_NETWORK));
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard write failed */
    }
  };

  return (
    <div className="py-3 px-4 rounded-[8px] flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors">
      <div className="flex min-w-0 items-center gap-3">
        <TokenLogo token={token} size={28} />
        <div className="flex min-w-0 flex-col">
          <div className="truncate font-[500] text-[13px] text-black">{token.name}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-[rgba(0,0,0,0.5)]">
            <span>{token.symbol}</span>
            {token.verification === "unverified" && <UnverifiedTag />}
            <button
              type="button"
              onClick={copyAddress}
              className="flex h-5 w-5 items-center justify-center rounded-sm text-gray-500 transition-colors duration-150 hover:bg-gray-100"
              title="Copy token address"
              aria-label="Copy token address"
            >
              {copied ? (
                <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      <TokenAmount faucetId={faucetId} amount={balance} className="text-[12px] font-[600] text-[#000000]" />
    </div>
  );
}

const TokenHoldings = ({ fungibleAssets, isLoading }: TokenHoldingsProps) => {
  return (
    <div className="flex flex-col gap-2 rounded-[10px] border border-[rgba(0,0,0,0.08)] p-4 w-full">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="font-[500] text-[#00000099] text-[16px]">
          Token Holdings
        </div>
      </div>

      {/* Token rows */}
      <div className="flex flex-col gap-2 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-[#FF5500] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[rgba(0,0,0,0.5)] text-[12px]">Loading tokens...</span>
            </div>
          </div>
        ) : fungibleAssets.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-gray-500 text-[12px]">No tokens available</span>
          </div>
        ) : (
          fungibleAssets.map((asset) => (
            <HoldingRow key={asset.faucetId} faucetId={asset.faucetId} balance={asset.balance} />
          ))
        )}
      </div>
    </div>
  );
};

export default TokenHoldings;

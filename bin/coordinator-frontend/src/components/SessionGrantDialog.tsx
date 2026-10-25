"use client";

import React, { useEffect, useRef, useState } from "react";
import { useMultisig } from "@/contexts/MultisigContext";
import { copyToClipboard, truncateHex } from "@/lib/helpers";
import { sessionLengthText, untilText } from "@/lib/guardianSession";

const HEX = /^0x[\da-f]+$/i;

const SIGNED_BY_SESSION = ["Reading your accounts", "Creating proposals", "Sending proposal signatures"];
const STILL_ASKS_WALLET = ["Signing transactions", "Execute, unlock and registration"];

/** The site asking: shown whole, since a lookalike differs only in part of it. */
const WEBSITE = "Website";

function HexValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={value}
      aria-label={`Copy ${value}`}
      onClick={() => copyToClipboard(value, () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })}
      className="group inline-flex max-w-full items-center gap-1.5 rounded-[6px] bg-[rgba(0,0,0,0.04)] px-1.5 py-0.5 font-mono text-[11px] text-[#111] transition-colors hover:bg-[rgba(0,0,0,0.08)]"
    >
      {truncateHex(value, 8, 6)}
      {copied ? (
        <svg className="h-3 w-3 shrink-0 text-[#16A34A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-3 w-3 shrink-0 text-[rgba(0,0,0,0.35)] group-hover:text-[rgba(0,0,0,0.6)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <rect x="9" y="9" width="11" height="11" rx="2" strokeWidth={2} />
          <path strokeWidth={2} d="M5 15V5a2 2 0 012-2h10" />
        </svg>
      )}
    </button>
  );
}

/**
 * Shows a Guardian session grant before the wallet signs it. Para and the
 * Miden Wallet sign it as a hash, and so does a Ledger with blind signing, so
 * this is the one place the user sees what they approve. A native modal
 * dialog: top layer (above the Ledger panel), inert background, Escape cancels.
 */
export function SessionGrantDialog() {
  const { sessionGrantPrompt, answerSessionGrant } = useMultisig();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (sessionGrantPrompt && !dialog.current?.open) dialog.current?.showModal();
    else if (!sessionGrantPrompt) dialog.current?.close();
  }, [sessionGrantPrompt]);

  const answer = (approved: boolean) => {
    if (sessionGrantPrompt) answerSessionGrant(sessionGrantPrompt.id, approved);
  };

  const rows = sessionGrantPrompt?.rows ?? [];
  const scope = rows.find((row) => row.label === "Scope")?.value;
  const length = sessionGrantPrompt && sessionGrantPrompt.expiresAt > sessionGrantPrompt.issuedAt
    ? sessionLengthText(sessionGrantPrompt.expiresAt - sessionGrantPrompt.issuedAt)
    : null;
  // The banner shows the length and the scope; the grid keeps the start and
  // end only when the length can't be shown.
  const details = rows.filter(({ label }) => label !== "Scope" && !(length && (label === "Valid from" || label === "Expires")));

  return (
    <dialog
      ref={dialog}
      aria-labelledby="session-grant-title"
      onCancel={(event) => {
        event.preventDefault();
        answer(false);
      }}
      className="m-auto w-[min(520px,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-hidden rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white p-0 shadow-xl backdrop:bg-black/25 backdrop:backdrop-blur-sm open:flex open:flex-col"
    >
      {sessionGrantPrompt && (
        <>
          {/* Header */}
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[rgba(0,0,0,0.06)] px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#FF5500]/10 text-[#FF5500]">
                <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 3v5c0 4.5-3 8.3-7 9.5-4-1.2-7-5-7-9.5V6l7-3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h2 id="session-grant-title" className="text-[15px] font-[600] text-[#111]">
                  Start a Guardian session
                </h2>
                <p className="text-[12px] text-[rgba(0,0,0,0.5)]">
                  Approve once instead of confirming every Guardian request.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => answer(false)}
              aria-label="Close"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-[rgba(0,0,0,0.4)] transition-colors hover:bg-gray-100"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-3.5">
            {(length || scope) && (
              <div className="flex items-start gap-2 rounded-[8px] border border-[#FF5500]/20 bg-[#FF5500]/5 px-3 py-2 text-[12px] text-[#111]">
                <svg className="mt-px h-4 w-4 shrink-0 text-[#FF5500]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <circle cx="12" cy="12" r="9" strokeWidth={2} />
                  <path strokeLinecap="round" strokeWidth={2} d="M12 7v5l3 2" />
                </svg>
                <div className="flex min-w-0 flex-col gap-0.5">
                  {length && (
                    <span>
                      Lasts <span className="font-[600]">{length}</span>
                      <span className="text-[rgba(0,0,0,0.5)]"> · until {untilText(sessionGrantPrompt.expiresAt)}</span>
                    </span>
                  )}
                  {/* Signed as part of the grant: what the session may act for. */}
                  {scope && <span className="text-[rgba(0,0,0,0.6)]">Covers: {scope}.</span>}
                </div>
              </div>
            )}

            <div>
              <div className="mb-1.5 text-[10px] font-[600] uppercase tracking-wide text-[rgba(0,0,0,0.45)]">
                After you approve
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-[8px] border border-[rgba(0,0,0,0.08)] px-3 py-2.5">
                  <div className="mb-1.5 text-[10px] font-[600] uppercase tracking-wide text-[rgba(0,0,0,0.45)]">
                    Signed for you
                  </div>
                  <ul className="flex flex-col gap-1">
                    {SIGNED_BY_SESSION.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-[12px] text-[#111]">
                        <svg className="h-3.5 w-3.5 shrink-0 text-[#16A34A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[8px] border border-[rgba(0,0,0,0.08)] px-3 py-2.5">
                  <div className="mb-1.5 text-[10px] font-[600] uppercase tracking-wide text-[rgba(0,0,0,0.45)]">
                    Still asks your wallet
                  </div>
                  <ul className="flex flex-col gap-1">
                    {STILL_ASKS_WALLET.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-[12px] text-[#111]">
                        <svg className="h-3.5 w-3.5 shrink-0 text-[rgba(0,0,0,0.45)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <rect x="5" y="11" width="14" height="10" rx="2" strokeWidth={2} />
                          <path strokeLinecap="round" strokeWidth={2} d="M8 11V7a4 4 0 018 0v4" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-[10px] font-[600] uppercase tracking-wide text-[rgba(0,0,0,0.45)]">
                Session details
              </div>
              <dl className="grid grid-cols-1 gap-x-3 gap-y-2.5 rounded-[8px] border border-[rgba(0,0,0,0.08)] px-3 py-2.5 sm:grid-cols-2">
                {details.map(({ label, value }) => (
                  <div key={label} className={`flex min-w-0 flex-col items-start gap-0.5 ${label === WEBSITE ? "sm:col-span-2" : ""}`}>
                    <dt className="text-[11px] text-[rgba(0,0,0,0.5)]">{label}</dt>
                    <dd className={`max-w-full text-[12px] text-[#111] ${label === WEBSITE ? "break-all" : "truncate"}`} title={value}>
                      {HEX.test(value) ? <HexValue value={value} /> : value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 flex-col gap-2 border-t border-[rgba(0,0,0,0.06)] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] leading-snug text-[rgba(0,0,0,0.5)]">
              Your wallet may show only a hash of these details.
            </p>
            <div className="flex shrink-0 justify-end gap-2">
              <button
                type="button"
                onClick={() => answer(false)}
                className="min-h-9 rounded-[6px] border border-[rgba(0,0,0,0.15)] px-4 text-[12px] font-[500] text-[#111] transition-colors hover:bg-[rgba(0,0,0,0.03)]"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={() => answer(true)}
                className="min-h-9 rounded-[6px] bg-[#FF5500] px-4 text-[12px] font-[500] text-white transition-colors hover:bg-[#E64A00]"
              >
                Approve in wallet
              </button>
            </div>
          </div>
        </>
      )}
    </dialog>
  );
}

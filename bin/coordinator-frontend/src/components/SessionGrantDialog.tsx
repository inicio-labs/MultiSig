"use client";

import React, { useEffect, useRef, useState } from "react";
import { useMultisig } from "@/contexts/MultisigContext";
import { copyToClipboard, truncateHex } from "@/lib/helpers";

const HEX = /^0x[\da-f]+$/i;

const SIGNED_BY_SESSION = ["Reading your accounts", "Creating proposals", "Sending proposal signatures"];
const STILL_ASKS_WALLET = ["Signing transactions", "Execute, unlock and registration"];

/** "2026-10-20 10:26:06 UTC" as a Date, or null when the format is not that. */
function parseUtc(value: string | undefined): Date | null {
  const match = value?.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) UTC$/);
  if (!match) return null;
  const date = new Date(`${match[1]}T${match[2]}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Guardian grants run a minute or so short of the hour, so near-whole hours round to it. */
function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  const nearestHour = Math.round(minutes / 60);
  if (nearestHour > 0 && Math.abs(minutes - nearestHour * 60) <= 2) {
    return `${nearestHour} hour${nearestHour === 1 ? "" : "s"}`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours === 0 ? `${rest} min` : `${hours} h ${rest} min`;
}

/** "10:36" in UTC. */
function utcTime(date: Date): string {
  return date.toISOString().slice(11, 16);
}

/** "20 Oct" in UTC. */
function utcDay(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** Rows shown elsewhere in the dialog, not in the details grid. */
const SHOWN_ELSEWHERE = new Set(["Valid from", "Expires", "Scope"]);

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
      className="group inline-flex items-center gap-1.5 rounded-[6px] bg-[rgba(0,0,0,0.04)] px-1.5 py-0.5 font-mono text-[11px] text-[#111] transition-colors hover:bg-[rgba(0,0,0,0.08)]"
    >
      {truncateHex(value, 8, 6)}
      {copied ? (
        <svg className="h-3 w-3 text-[#16A34A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-3 w-3 text-[rgba(0,0,0,0.35)] group-hover:text-[rgba(0,0,0,0.6)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
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
  const valueOf = (label: string) => rows.find((row) => row.label === label)?.value;
  const validFrom = parseUtc(valueOf("Valid from"));
  const expires = parseUtc(valueOf("Expires"));
  const duration = validFrom && expires && expires > validFrom ? formatDuration(expires.getTime() - validFrom.getTime()) : null;

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
            {duration && (
              <div className="flex items-center gap-2 rounded-[8px] border border-[#FF5500]/20 bg-[#FF5500]/5 px-3 py-2 text-[12px] text-[#111]">
                <svg className="h-4 w-4 shrink-0 text-[#FF5500]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <circle cx="12" cy="12" r="9" strokeWidth={2} />
                  <path strokeLinecap="round" strokeWidth={2} d="M12 7v5l3 2" />
                </svg>
                <span>
                  Lasts <span className="font-[600]">{duration}</span>
                  <span className="text-[rgba(0,0,0,0.5)]">
                    {" "}· {utcTime(validFrom!)} – {utcTime(expires!)} UTC, {utcDay(expires!)}
                  </span>
                </span>
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
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-[8px] border border-[rgba(0,0,0,0.08)] px-3 py-2.5">
                {rows
                  .filter(({ label }) => !(SHOWN_ELSEWHERE.has(label) && (label === "Scope" || duration)))
                  .map(({ label, value }) => (
                    <div key={label} className="flex min-w-0 flex-col items-start gap-0.5">
                      <dt className="text-[11px] text-[rgba(0,0,0,0.5)]">{label}</dt>
                      <dd className="max-w-full truncate text-[12px] text-[#111]" title={value}>
                        {HEX.test(value) ? <HexValue value={value} /> : value}
                      </dd>
                    </div>
                  ))}
              </dl>
            </div>

            <div className="flex flex-col gap-1 px-3">
              {valueOf("Scope") && (
                <p className="text-[12px] leading-snug text-[#111]">
                  <span className="font-[600]">Scope: </span>
                  {valueOf("Scope")}.
                </p>
              )}
              <p className="text-[11px] leading-snug text-[rgba(0,0,0,0.55)]">
                Your wallet may show only a hash of these values, so check them here before approving.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 justify-end gap-2 border-t border-[rgba(0,0,0,0.06)] px-5 py-3">
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
        </>
      )}
    </dialog>
  );
}

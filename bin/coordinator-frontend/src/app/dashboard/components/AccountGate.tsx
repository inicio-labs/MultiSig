"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SignatureScheme } from "@openzeppelin/miden-multisig-client";
import { MIDEN_NETWORK } from "@/config/psm";
import { useMultisig, useTokenEnv } from "@/contexts/MultisigContext";
import { WALLET_NAME, WALLET_RECONNECT_WAIT_MS, gateView } from "@/lib/accountGate";
import { accountAddress } from "@/lib/findAccounts";
import { shortHex } from "@/lib/proposalDescription";
import type { WalletSource } from "@/wallets/types";

const PRIMARY = "inline-flex h-10 min-w-[200px] items-center justify-center rounded-[8px] bg-[#FF5500] px-4 text-[14px] font-[500] text-white transition-colors hover:bg-[#E64A00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5500] disabled:cursor-not-allowed disabled:opacity-60";
const SECONDARY = "inline-flex h-9 min-w-[200px] items-center justify-center rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-4 text-[13px] font-[500] text-[#111] transition-colors hover:bg-gray-50";
const EXTERNAL: WalletSource[] = ["miden-wallet", "para", "ledger"];

function savedValue(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function Spinner() {
  return <span aria-hidden className="h-5 w-5 animate-spin rounded-full border-2 border-[rgba(0,0,0,0.15)] border-t-[#FF5500]" />;
}

/**
 * Stands in for the dashboard page until an account is open (see
 * accountGate.ts): reconnecting, a button that names the wallet to connect,
 * or why the account could not open. A wallet connected while it shows opens
 * the saved account straight away.
 */
const AccountGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    multisig,
    walletSource,
    setWalletSource,
    activeCommitment,
    loadingAccount,
    error,
    clientStartup,
    retryClientStartup,
    handleLoad,
    connectMidenWallet,
    midenWalletSession,
    openParaModal,
    paraSession,
    ledger,
    lastKnownAccount,
  } = useMultisig();
  const { sdkReady } = useTokenEnv();
  const [savedId] = useState(() => savedValue("currentWalletId"));
  const [waitedForWallet, setWaitedForWallet] = useState(false);
  const [otherWallets, setOtherWallets] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setWaitedForWallet(true), WALLET_RECONNECT_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  // A connected wallet opens the saved account, once per connection: a failed
  // load waits for Try again, and an account closed on purpose stays closed
  // until the wallet changes or reconnects (an unplugged Ledger, plugged back
  // in). Ledger is connected only by the user's click.
  const tried = useRef<string | null>(null);
  useEffect(() => {
    if (!activeCommitment) {
      tried.current = null;
      return;
    }
    const key = `${savedId}|${walletSource}|${activeCommitment}`;
    if (multisig) {
      tried.current = key;
      return;
    }
    if (loadingAccount || !savedId || tried.current === key) return;
    tried.current = key;
    handleLoad(savedId, schemeFor(walletSource)).catch(() => {
      // Shown below through `error`.
    });
  }, [multisig, loadingAccount, savedId, activeCommitment, walletSource, handleLoad]);

  const view = gateView({
    accountOpen: Boolean(multisig),
    savedId,
    walletSource,
    walletConnected: Boolean(activeCommitment),
    loading: loadingAccount,
    startupError: clientStartup.phase === "error" ? clientStartup.error : null,
    error,
    waitedForWallet,
  });
  if (view.kind === "open") return <>{children}</>;

  const connect = (source: WalletSource) => {
    setOtherWallets(false);
    if (source === "ledger") {
      ledger.show();
    } else if (source === "para") {
      if (paraSession.connected) setWalletSource("para");
      else openParaModal();
    } else if (midenWalletSession.connected) {
      setWalletSource("miden-wallet");
    } else {
      void connectMidenWallet();
    }
  };

  let address = lastKnownAccount?.address;
  if (!address && savedId && sdkReady) {
    try {
      address = accountAddress(savedId, MIDEN_NETWORK);
    } catch {
      // No address line.
    }
  }

  // Which account: under the first line, above any button.
  const which = address && (
    <p className="font-mono text-[12px] text-[rgba(0,0,0,0.5)]" title={address}>{shortHex(address, 10, 6)}</p>
  );

  let body: React.ReactNode;
  switch (view.kind) {
    case "no-account":
      body = (
        <>
          <h1 className="text-[16px] font-[500] text-[#111]">No account open</h1>
          <Link href="/login" className={PRIMARY}>Open an account</Link>
        </>
      );
      break;
    case "opening":
      body = (<><Spinner /><p className="text-[14px] text-[#111]">Opening your account…</p>{which}</>);
      break;
    case "connecting":
      body = (<><Spinner /><p className="text-[14px] text-[#111]">Connecting {WALLET_NAME[view.wallet]}…</p>{which}</>);
      break;
    case "connect":
      body = (
        <>
          <h1 className="text-[16px] font-[500] text-[#111]">Connect your wallet</h1>
          {which}
          <button type="button" onClick={() => connect(view.wallet)} disabled={view.wallet === "ledger" && ledger.open} className={PRIMARY}>
            Connect {WALLET_NAME[view.wallet]}
          </button>
        </>
      );
      break;
    case "failed":
      body = (
        <>
          <h1 className="text-[16px] font-[500] text-[#111]">{view.retry === "startup" ? "Couldn't start" : "Couldn't open your account"}</h1>
          {which}
          <p role="alert" className="max-w-[420px] break-words text-[13px] text-red-700">{view.message}</p>
          <button
            type="button"
            onClick={() => {
              if (view.retry === "startup") void retryClientStartup();
              else if (savedId) handleLoad(savedId, schemeFor(walletSource)).catch(() => {});
            }}
            className={PRIMARY}
          >
            Try again
          </button>
        </>
      );
      break;
  }

  const canSwitch = view.kind === "connect" || (view.kind === "failed" && view.retry === "load");
  const others = EXTERNAL.filter((source) => source !== walletSource);

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-[420px] flex-col items-center gap-3 text-center">
        {body}
        {canSwitch && !otherWallets && (
          <button type="button" onClick={() => setOtherWallets(true)} className="text-[12px] text-[rgba(0,0,0,0.55)] underline underline-offset-2 hover:text-[#111]">
            Use another wallet
          </button>
        )}
        {canSwitch && otherWallets && others.map((source) => (
          <button key={source} type="button" onClick={() => connect(source)} className={SECONDARY}>
            Connect {WALLET_NAME[source]}
          </button>
        ))}
      </div>
    </div>
  );
};

/** The scheme the account was last opened with; Ledger signs ECDSA. */
function schemeFor(source: WalletSource): SignatureScheme {
  if (source === "ledger") return "ecdsa";
  const saved = savedValue("currentWalletScheme");
  return saved === "ecdsa" || saved === "falcon" ? saved : "falcon";
}

export default AccountGate;

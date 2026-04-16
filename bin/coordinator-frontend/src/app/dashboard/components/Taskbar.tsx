"use client";
import React, { useState, useMemo } from "react";
import Image from "next/image";
import media from "../../../../public/media";
import { useMultisig } from "@/contexts/MultisigContext";
import { truncateHex, copyToClipboard } from "@/lib/helpers";
import { AccountId, AccountInterface, NetworkId } from "@miden-sdk/miden-sdk";
import { toast } from "sonner";
import { TaskBarProps } from "@/types";

const TaskBar: React.FC<TaskBarProps> = () => {
  const {
    guardianUrl,
    setGuardianUrl,
    guardianStatus,
    connectToGuardian,
    activeCommitment,
    activeScheme,
    walletSource,
    setWalletSource,
    signer,
    generatingSigner,
    syncingState,
    handleSync,
    multisig,
    paraSession,
    midenWalletSession,
    connectMidenWallet,
    disconnectMidenWallet,
    openParaModal,
  } = useMultisig();

  const [isCopied, setIsCopied] = useState(false);
  const [isBech32Copied, setIsBech32Copied] = useState(false);
  const [showGuardianEditor, setShowGuardianEditor] = useState(false);
  const [guardianUrlDraft, setGuardianUrlDraft] = useState(guardianUrl);
  const [showSignerKeys, setShowSignerKeys] = useState(false);

  const walletName = useMemo(() => {
    if (typeof window === 'undefined') return "Multisig Wallet";
    const saved = localStorage.getItem("walletFormData");
    if (saved) {
      try { return JSON.parse(saved).walletName || "Multisig Wallet"; } catch { return "Multisig Wallet"; }
    }
    return "Multisig Wallet";
  }, []);

  const accountId = useMemo(() => {
    return multisig?.accountId ?? localStorage.getItem("currentWalletId") ?? null;
  }, [multisig]);

  const copyAccountId = () => {
    if (accountId) {
      copyToClipboard(accountId, () => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    }
  };

  const copyBech32 = () => {
    if (!accountId) return;
    try {
      const bech32 = AccountId.fromHex(accountId).toBech32(NetworkId.testnet(), AccountInterface.BasicWallet);
      copyToClipboard(bech32, () => {
        setIsBech32Copied(true);
        setTimeout(() => setIsBech32Copied(false), 2000);
        toast.success("Bech32 address copied");
      });
    } catch {
      toast.error("Failed to convert account ID to bech32");
    }
  };

  const handleGuardianReconnect = async () => {
    setGuardianUrl(guardianUrlDraft);
    await connectToGuardian(guardianUrlDraft);
    setShowGuardianEditor(false);
    toast.success("Reconnected to Guardian");
  };

  return (
    <div className="border-b-[0.5px] border-[#0000001A] p-2 bg-white">
      <div className="flex items-center justify-between">
        {/* Left side - Account info — width matches sidebar */}
        <div className="w-[220px] flex items-center justify-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[8px] bg-[#DFD8D3] flex items-center justify-center shrink-0">
            <span className="text-[13px] font-[600] text-[#FF5500]">
              {walletName.slice(0, 1).toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col">
            <div className="text-[13px] text-[#111] font-[600]">
              {walletName}
            </div>
            <div className="flex items-center gap-2">
              <div
                className="text-[11px] text-[rgba(0,0,0,0.5)] font-[400] cursor-help"
                title={accountId || "No Account ID"}
              >
                {accountId ? truncateHex(accountId, 8, 6) : "No Account"}
              </div>
              <button
                onClick={copyAccountId}
                className="flex items-center justify-center w-4 h-4 bg-gray-100 hover:bg-gray-200 rounded transition-colors duration-150"
                title="Copy hex account ID"
              >
                {isCopied ? (
                  <svg className="w-2.5 h-2.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-2.5 h-2.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
              <button
                onClick={copyBech32}
                disabled={!accountId}
                className="flex items-center justify-center px-1 h-4 bg-gray-100 hover:bg-gray-200 rounded transition-colors duration-150 text-[7px] font-dmmono font-[500] disabled:opacity-40 disabled:cursor-not-allowed"
                title="Copy bech32 address"
              >
                {isBech32Copied ? (
                  <svg className="w-2.5 h-2.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-gray-600">B32</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Center - PSM Status & Wallet Source */}
        <div className="flex items-center gap-3">
          {/* Guardian Status Badge */}
          <div className="relative">
            <button
              onClick={() => { setShowPsmEditor(!showPsmEditor); setPsmUrlDraft(psmUrl); }}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-[500] transition-colors ${
                psmStatus === 'connected'
                  ? 'bg-[rgba(46,161,80,0.08)] text-[rgba(46,161,80,1)] hover:bg-[rgba(46,161,80,0.12)]'
                  : psmStatus === 'connecting'
                    ? 'bg-[rgba(234,179,8,0.08)] text-[rgba(180,140,0,1)] hover:bg-[rgba(234,179,8,0.12)]'
                    : 'bg-[rgba(220,38,38,0.08)] text-[rgba(220,38,38,1)] hover:bg-[rgba(220,38,38,0.12)]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                guardianStatus === 'connected' ? 'bg-green-500' :
                guardianStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
              }`} />
              GUARDIAN {guardianStatus}
            </button>

            {/* Guardian Endpoint Editor Popover */}
            {showGuardianEditor && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded shadow-lg p-3 w-[320px]">
                <div className="text-[10px] font-[500] mb-1">PSM Endpoint</div>
                <input
                  type="text"
                  value={psmUrlDraft}
                  onChange={(e) => setPsmUrlDraft(e.target.value)}
                  className="w-full text-[11px] border border-gray-200 rounded px-2 py-1 mb-2 focus:outline-none focus:ring-1 focus:ring-[#FF5500]"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handlePsmReconnect}
                    className="flex-1 bg-[#FF5500] text-white text-[10px] px-2 py-1 rounded hover:bg-[#E04A00] transition-colors"
                  >
                    RECONNECT
                  </button>
                  <button
                    onClick={() => setShowPsmEditor(false)}
                    className="flex-1 border border-gray-200 text-[10px] px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            )}
          </div>

<<<<<<< HEAD
          {/* Wallet Source Selector */}
          <div className="flex items-center gap-1">
            {process.env.NODE_ENV !== 'production' && (
              <button
                onClick={() => setWalletSource('local')}
                className={`px-2 py-1 text-[9px] font-dmmono font-[500] border rounded transition-colors ${
                  walletSource === 'local' ? 'bg-[#FF5500] text-white border-[#FF5500]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#FF5500]'
                }`}
              >
                LOCAL
              </button>
            )}
=======
          {/* Wallet Source Selector — segmented control */}
          <div className="flex items-center h-8 bg-[rgba(245,245,245,1)] rounded-[8px] p-0.5">
            <button
              onClick={() => setWalletSource('local')}
              className={`flex items-center px-3 h-full text-[11px] font-[500] rounded-[6px] transition-all ${
                walletSource === 'local'
                  ? 'bg-white text-[#FF5500] shadow-sm'
                  : 'text-[rgba(0,0,0,0.55)] hover:text-[#111]'
              }`}
            >
              Local
            </button>
>>>>>>> db4908d (style: remove redundant font-geist from child elements)
            <button
              onClick={() => {
                if (paraSession.connected) {
                  setWalletSource('para');
                } else {
                  openParaModal();
                }
              }}
<<<<<<< HEAD
              className={`px-2 py-1 text-[9px] font-dmmono font-[500] border rounded transition-colors ${
                walletSource === 'para' ? 'bg-[#FF5500] text-white border-[#FF5500]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#FF5500]'
=======
              className={`flex items-center px-3 h-full text-[11px] font-[500] rounded-[6px] transition-all ${
                walletSource === 'para'
                  ? 'bg-white text-[#FF5500] shadow-sm'
                  : 'text-[rgba(0,0,0,0.55)] hover:text-[#111]'
>>>>>>> db4908d (style: remove redundant font-geist from child elements)
              }`}
            >
              PARA {paraSession.connected ? '(connected)' : ''}
            </button>
            <button
              onClick={() => {
                if (midenWalletSession.connected) {
                  setWalletSource('miden-wallet');
                } else {
                  connectMidenWallet();
                }
              }}
<<<<<<< HEAD
              className={`px-2 py-1 text-[9px] font-dmmono font-[500] border rounded transition-colors ${
                walletSource === 'miden-wallet' ? 'bg-[#FF5500] text-white border-[#FF5500]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#FF5500]'
=======
              className={`flex items-center px-3 h-full text-[11px] font-[500] rounded-[6px] transition-all ${
                walletSource === 'miden-wallet'
                  ? 'bg-white text-[#FF5500] shadow-sm'
                  : 'text-[rgba(0,0,0,0.55)] hover:text-[#111]'
>>>>>>> db4908d (style: remove redundant font-geist from child elements)
              }`}
            >
              WALLET {midenWalletSession.connected ? '(connected)' : ''}
            </button>
          </div>
        </div>

        {/* Right side - Signer Keys & Sync */}
        <div className="flex items-center gap-2 pr-2">
          {/* Active Commitment Display */}
          <div className="relative">
            <button
              onClick={() => setShowSignerKeys(!showSignerKeys)}
<<<<<<< HEAD
              className="flex items-center gap-1 px-2 py-1 text-[9px] font-dmmono font-[500] border border-gray-200 rounded hover:border-[#FF5500] transition-colors"
=======
              className="flex items-center gap-2 h-8 px-3 text-[11px] font-[500] bg-[rgba(245,245,245,1)] rounded-[8px] hover:bg-[rgba(235,235,235,1)] transition-colors"
>>>>>>> db4908d (style: remove redundant font-geist from child elements)
              title={activeCommitment || "No commitment"}
            >
              <span className="text-gray-500">{activeScheme.toUpperCase()}</span>
              <span>{activeCommitment ? truncateHex(activeCommitment, 6, 4) : generatingSigner ? 'Generating...' : 'N/A'}</span>
            </button>

            {/* Signer Keys Popover */}
            {showSignerKeys && signer && (
              <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-200 rounded shadow-lg p-3 w-[360px]">
<<<<<<< HEAD
                <div className="text-[10px] font-dmmono font-[500] mb-2 uppercase">Local Signer Keys</div>
                <div className="space-y-2">
                  <div>
                    <div className="text-[9px] font-dmmono text-gray-500 uppercase">Falcon Commitment</div>
                    <div
                      className="text-[10px] font-dmmono bg-gray-50 p-1 rounded cursor-pointer hover:bg-gray-100 break-all"
=======
                <div className="text-[10px] font-[500] mb-2">Local Signer Keys</div>
                <div className="space-y-2">
                  <div>
                    <div className="text-[9px] text-gray-500">Falcon Commitment</div>
                    <div
                      className="text-[10px] bg-gray-50 p-1 rounded cursor-pointer hover:bg-gray-100 break-all"
>>>>>>> db4908d (style: remove redundant font-geist from child elements)
                      onClick={() => copyToClipboard(signer.falcon.commitment, () => toast.success("Falcon commitment copied"))}
                      title="Click to copy"
                    >
                      {signer.falcon.commitment}
                    </div>
                  </div>
                  <div>
<<<<<<< HEAD
                    <div className="text-[9px] font-dmmono text-gray-500 uppercase">ECDSA Commitment</div>
                    <div
                      className="text-[10px] font-dmmono bg-gray-50 p-1 rounded cursor-pointer hover:bg-gray-100 break-all"
=======
                    <div className="text-[9px] text-gray-500">ECDSA Commitment</div>
                    <div
                      className="text-[10px] bg-gray-50 p-1 rounded cursor-pointer hover:bg-gray-100 break-all"
>>>>>>> db4908d (style: remove redundant font-geist from child elements)
                      onClick={() => copyToClipboard(signer.ecdsa.commitment, () => toast.success("ECDSA commitment copied"))}
                      title="Click to copy"
                    >
                      {signer.ecdsa.commitment}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowSignerKeys(false)}
<<<<<<< HEAD
                  className="mt-2 w-full text-[9px] font-dmmono border border-gray-200 rounded py-1 hover:bg-gray-50"
=======
                  className="mt-2 w-full text-[9px] border border-gray-200 rounded py-1 hover:bg-gray-50"
>>>>>>> db4908d (style: remove redundant font-geist from child elements)
                >
                  CLOSE
                </button>
              </div>
            )}
          </div>

          {/* Sync Button */}
          {multisig && (
            <button
              onClick={handleSync}
              disabled={syncingState}
<<<<<<< HEAD
              className="px-2 py-1 text-[9px] font-dmmono font-[500] border border-gray-200 rounded hover:border-[#FF5500] hover:bg-[#FF5500]/5 transition-colors disabled:opacity-50"
=======
              className="flex items-center h-8 px-3 text-[11px] font-[500] text-[#111] bg-[rgba(245,245,245,1)] rounded-[8px] hover:bg-[rgba(235,235,235,1)] transition-colors disabled:opacity-50"
>>>>>>> db4908d (style: remove redundant font-geist from child elements)
              title="Sync state"
            >
              {syncingState ? (
                <span className="flex items-center gap-1">
                  <span className="animate-spin rounded-full h-2.5 w-2.5 border border-gray-400 border-t-transparent" />
                  SYNCING
                </span>
              ) : (
                "SYNC"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskBar;

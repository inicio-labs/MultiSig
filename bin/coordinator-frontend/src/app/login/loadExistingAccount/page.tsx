"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../hooks/useAuth";
import { useMultisig } from "@/contexts/MultisigContext";
import { MIDEN_NETWORK } from "@/config/psm";
import { accountIdFromInput, accountLookupRunner, type AccountLookup } from "@/lib/findAccounts";
import type { WalletSource } from "@/wallets/types";
import { toast } from "sonner";

// Force dynamic rendering to avoid WASM loading issues during build
export const dynamic = 'force-dynamic';

/** What the button says while the wallet asks for the lookup signature. */
const CHECK_WALLET: Record<WalletSource, string> = {
    "miden-wallet": "Check Miden Wallet",
    para: "Check Para",
    ledger: "Approve on Ledger",
    local: "Signing",
};

const SearchIcon = () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"
        className="h-4 w-4 shrink-0 text-[rgba(255,85,0,1)]">
        <circle cx="9" cy="9" r="6" />
        <path d="M13.5 13.5 18 18" />
    </svg>
);

const CheckIcon = ({ shown }: { shown: boolean }) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden="true"
        className={`h-4 w-4 shrink-0 text-[rgba(255,85,0,1)] ${shown ? "visible" : "invisible"}`}>
        <path d="M4.5 10.5 8.5 14.5 15.5 6.5" />
    </svg>
);

const LoadExistingWallet = () => {
    const router = useRouter();
    const { setWalletId } = useAuth();
    const {
        handleLoad, findMyAccounts, loadingAccount, error: multisigError,
        activeScheme, activeCommitment, walletSource,
    } = useMultisig();
    const [accountAddress, setAccountAddress] = useState("");
    const [accountName, setAccountName] = useState("");
    const [localError, setLocalError] = useState<string | null>(null);
    const [lookup, setLookup] = useState<AccountLookup>({ phase: "idle" });
    const lookups = useMemo(() => accountLookupRunner(setLookup), []);
    const lookupBusy = lookup.phase === "starting" || lookup.phase === "asking";

    // Accounts found for another wallet's key do not belong to this one, nor
    // does a lookup that wallet still has open.
    useEffect(() => {
        lookups.reset();
    }, [activeCommitment, lookups]);

    const handleLoadWallet = async () => {
        if (!accountAddress.trim() || !accountName.trim()) {
            setLocalError("Please enter both account name and account address.");
            return;
        }

        // A Miden address (mm1… on mainnet) or a hex account ID.
        let accountId: string;
        try {
            accountId = accountIdFromInput(accountAddress, MIDEN_NETWORK);
        } catch (error) {
            setLocalError(error instanceof Error ? error.message : String(error));
            return;
        }

        setLocalError(null);
        try {
            await handleLoad(accountId, activeScheme);

            // Store walletFormData with just walletName
            const walletFormData = {
                walletName: accountName.trim(),
                signatureThreshold: "",
                totalSigners: "",
                network: "",
                signerAddresses: [],
                signerPublicKeys: []
            };
            localStorage.setItem("walletFormData", JSON.stringify(walletFormData));

            setWalletId(accountId);
            localStorage.setItem("currentWalletId", accountId);
            router.push("/dashboard/home");
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Failed to load account";
            setLocalError(msg);
            toast.error(msg);
        }
    };

    const displayError = localError || multisigError;
    const lookupNote = !activeCommitment
        ? "Connect a wallet first"
        : lookup.phase === "none"
            ? "No accounts found"
            : lookup.phase === "failed" ? lookup.message : null;

    return (
        <>
            <div className="w-[90%] sm:w-[70%] flex flex-col md:space-y-14 sm:space-y-12 space-y-10 lg:space-y-16 md:w-[50%] lg:w-[40%] mx-auto h-screen py-4 md:py-6">
                {/* header starts here */}
                <div className="w-full flex flex-col space-y-1">
                    <div className="flex flex-row justify-between w-full">
                        <div className="md:text-[18px] sm:text-[16px] text-[15px] lg:text-[20px] font-[500]">
                            Load Existing Account
                        </div>
                    </div>
                </div>
                {/* header ends here */}

                <div className="w-full flex flex-col lg:space-y-6 md:space-y-5 sm:space-y-4 space-y-3">
                    <div className="w-full border border-[rgba(0,0,0,0.12)] rounded-[10px] h-auto flex flex-col p-8 lg:space-y-6 md:space-y-5 sm:space-y-4 space-y-4">
                        <div className="w-full flex flex-col gap-5">
                            {/* Find your accounts: Guardian's lookup by the wallet's key */}
                            {lookup.phase === "found" ? (
                                <div className="flex flex-col gap-2">
                                    <div className="lg:text-[14px] md:text-[13px] sm:text-[12px] text-[12px] font-[500] text-[#111]">
                                        Your accounts
                                    </div>
                                    <ul className="flex flex-col gap-1.5">
                                        {lookup.accounts.map((account) => {
                                            const selected = accountAddress === account.address;
                                            return (
                                                <li key={account.address}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setAccountAddress(account.address);
                                                            setLocalError(null);
                                                        }}
                                                        aria-pressed={selected}
                                                        title={account.address}
                                                        className={`w-full min-h-[42px] flex items-center justify-between gap-2.5 rounded-[8px] border px-3 py-2 font-mono text-[12.5px] text-left text-[#111] transition-colors ${selected ? "border-[rgba(255,85,0,1)] bg-[#FFF6F1]" : "border-[rgba(0,0,0,0.1)] bg-white hover:border-[rgba(255,85,0,0.45)]"}`}
                                                    >
                                                        {/* One line: in full when it fits, else shortened in the middle. */}
                                                        <span className="flex min-w-0">
                                                            <span className="truncate">{account.address.slice(0, -8)}</span>
                                                            <span className="shrink-0">{account.address.slice(-8)}</span>
                                                        </span>
                                                        <CheckIcon shown={selected} />
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <button
                                        type="button"
                                        onClick={() => void lookups.run(findMyAccounts)}
                                        disabled={!activeCommitment || lookupBusy || loadingAccount}
                                        className="w-full lg:h-[44px] md:h-[40px] h-[36px] flex items-center justify-center gap-2 rounded-[8px] border border-[rgba(0,0,0,0.14)] bg-white font-[500] lg:text-[14px] md:text-[13px] text-[12px] text-[#111] transition-colors enabled:hover:border-[rgba(255,85,0,1)] enabled:hover:bg-[#FFFAF7] disabled:cursor-not-allowed disabled:text-[rgba(0,0,0,0.42)]"
                                    >
                                        {lookupBusy ? (
                                            <>
                                                <span aria-hidden="true" className="h-[15px] w-[15px] shrink-0 rounded-full border-2 border-[rgba(255,85,0,0.22)] border-t-[rgba(255,85,0,1)] animate-spin" />
                                                {lookup.phase === "asking" ? CHECK_WALLET[walletSource] : "Starting…"}
                                            </>
                                        ) : (
                                            <>
                                                <SearchIcon />
                                                Find your accounts
                                            </>
                                        )}
                                    </button>
                                    {lookupNote && (
                                        <div className={`text-center text-[12px] ${lookup.phase === "failed" && activeCommitment ? "text-red-600" : "text-[rgba(0,0,0,0.45)]"}`}>
                                            {lookupNote}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center gap-3 text-[12px] text-[rgba(0,0,0,0.35)]">
                                <span className="h-px flex-1 bg-[rgba(0,0,0,0.09)]" />
                                or
                                <span className="h-px flex-1 bg-[rgba(0,0,0,0.09)]" />
                            </div>

                            <div className="flex flex-col lg:space-y-2 md:space-y-1.5 space-y-1">
                                <div className="lg:text-[14px] md:text-[13px] sm:text-[12px] text-[12px] font-[500] text-[#111]">
                                    Account Name
                                </div>
                                <input
                                    type="text"
                                    value={accountName}
                                    onChange={(e) => setAccountName(e.target.value)}
                                    placeholder="Enter account name"
                                    className="bg-[rgba(245,245,245,1)] w-full lg:h-[44px] md:h-[40px] sm:h-[36px] h-[32px] border border-[rgba(217,217,217,1)] rounded-[6px] px-3 font-[400] text-[13px]"
                                />
                            </div>

                            <div className="flex flex-col lg:space-y-2 md:space-y-1.5 space-y-1">
                                <div className="lg:text-[14px] md:text-[13px] sm:text-[12px] text-[12px] font-[500] text-[#111]">
                                    Account Address
                                </div>
                                <input
                                    type="text"
                                    value={accountAddress}
                                    onChange={(e) => setAccountAddress(e.target.value)}
                                    placeholder="mm1… or 0x…"
                                    spellCheck={false}
                                    autoCapitalize="off"
                                    className="bg-[rgba(245,245,245,1)] w-full lg:h-[44px] md:h-[40px] sm:h-[36px] h-[32px] border border-[rgba(217,217,217,1)] rounded-[6px] px-3 font-[400] text-[13px]"
                                />
                            </div>

                            {/* Error Display */}
                            {displayError && (
                                <div className="w-full border border-red-300 text-[12px] font-[400] bg-red-50 rounded-[6px] p-3 text-red-600">
                                    {displayError}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* button section starts here  */}
                    <div className="w-[90%] mx-auto lg:h-[44px] md:h-[40px] sm:h-[36px] h-[32px] flex flex-row justify-between">
                        <button
                            onClick={() => router.back()}
                            className="bg-white border border-[rgba(0,0,0,0.15)] rounded-[8px] w-[144px] h-full font-[500] lg:text-[14px] md:text-[13px] sm:text-[12px] text-[11px] text-[#111] hover:bg-[rgba(0,0,0,0.03)] transition-colors"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleLoadWallet}
                            disabled={loadingAccount || lookupBusy}
                            className="bg-[rgba(255,85,0,1)] px-4 min-w-[144px] rounded-[8px] h-full font-[500] lg:text-[14px] md:text-[13px] sm:text-[12px] text-[11px] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loadingAccount ? "Loading..." : "Load Account"}
                        </button>
                    </div>
                    {/* button section ends here  */}
                </div>
            </div>
        </>
    );
};

export default LoadExistingWallet;

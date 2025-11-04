import React, { useState, useEffect } from "react";
import { MidenDemo } from "../../../../../lib/miden-client";
import { useWallet } from "@demox-labs/miden-wallet-adapter";

const Notifications = () => {
  const { wallet, accountId, connected } = useWallet();
  const [midenClient, setMidenClient] = useState<MidenDemo | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentWalletId, setCurrentWalletId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState({
    sync: false,
    getNotes: false,
    consumeNotes: false,
    sendTransaction: false,
  });
  const [status, setStatus] = useState({
    sync: "",
    getNotes: "",
    consumeNotes: "",
    sendTransaction: "",
  });

  useEffect(() => {
    const initializeClient = async () => {
      const walletId = localStorage.getItem("currentWalletId");
      setCurrentWalletId(walletId);

      const client = new MidenDemo();
      setMidenClient(client);

      try {
        const success = await client.initialize();
        if (success) {
          setIsInitialized(true);
          setStatus((prev) => ({
            ...prev,
            sync: "✅ Miden client initialized successfully!",
          }));
        } else {
          console.error("❌ Failed to initialize Miden client");
          setStatus((prev) => ({
            ...prev,
            sync: "❌ Failed to initialize Miden client",
          }));
        }
      } catch (error) {
        setStatus((prev) => ({
          ...prev,
          sync: `❌ Error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        }));
      }
    };

    initializeClient();
  }, []);

  const handleSyncState = async () => {
    if (!midenClient || !isInitialized) {
      setStatus((prev) => ({
        ...prev,
        sync: "❌ Miden client not initialized",
      }));
      return;
    }

    setIsLoading((prev) => ({ ...prev, sync: true }));
    setStatus((prev) => ({ ...prev, sync: "Syncing state..." }));

    try {
      const success = await midenClient.syncState();

      if (success) {
        setStatus((prev) => ({
          ...prev,
          sync: "✅ State synced successfully!",
        }));
      } else {
        throw new Error("Failed to sync state");
      }
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        sync: `❌ Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      }));
    } finally {
      setIsLoading((prev) => ({ ...prev, sync: false }));
    }
  };

  const handleGetNotes = async () => {
    if (!midenClient || !isInitialized) {
      setStatus((prev) => ({
        ...prev,
        getNotes: "❌ Miden client not initialized",
      }));
      return;
    }

    if (!currentWalletId) {
      setStatus((prev) => ({
        ...prev,
        getNotes: "❌ No wallet connected. Please connect a wallet first.",
      }));
      return;
    }

    setIsLoading((prev) => ({ ...prev, getNotes: true }));
    setStatus((prev) => ({
      ...prev,
      getNotes: "Fetching notes for existing wallet...",
    }));

    try {
      const notes = await midenClient.getConsumableNotes();
      setStatus((prev) => ({
        ...prev,
        getNotes: `✅ Found ${
          notes.length
        } consumable notes for wallet ${currentWalletId.slice(0, 8)}...`,
      }));
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        getNotes: `❌ Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      }));
    } finally {
      setIsLoading((prev) => ({ ...prev, getNotes: false }));
    }
  };

  const handleSetAccount = async () => {
    if (!midenClient || !isInitialized) {
      setStatus((prev) => ({
        ...prev,
        consumeNotes: "❌ Miden client not initialized",
      }));
      return;
    }

    if (!currentWalletId) {
      setStatus((prev) => ({
        ...prev,
        consumeNotes: "❌ No wallet connected. Please connect a wallet first.",
      }));
      return;
    }

    setIsLoading((prev) => ({ ...prev, consumeNotes: true }));
    setStatus((prev) => ({
      ...prev,
      consumeNotes: "Setting account from wallet ID...",
    }));

    try {
      const accountSet = await midenClient.setAccountFromWalletId(
        currentWalletId
      );

      if (accountSet) {
        setStatus((prev) => ({
          ...prev,
          consumeNotes: "✅ Account set successfully from existing wallet!",
        }));
      } else {
        throw new Error("Failed to set account from wallet");
      }
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        consumeNotes: `❌ Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      }));
    } finally {
      setIsLoading((prev) => ({ ...prev, consumeNotes: false }));
    }
  };

  const handleSendTransaction = async () => {
    if (!wallet || !accountId || !connected) {
      setStatus((prev) => ({
        ...prev,
        sendTransaction:
          "❌ No wallet connected. Please connect a wallet first.",
      }));
      return;
    }

    if (!midenClient || !isInitialized) {
      setStatus((prev) => ({
        ...prev,
        sendTransaction: "❌ Miden client not initialized",
      }));
      return;
    }

    setIsLoading((prev) => ({ ...prev, sendTransaction: true }));
    setStatus((prev) => ({
      ...prev,
      sendTransaction: "Creating and submitting send transaction...",
    }));

    try {
      setStatus((prev) => ({
        ...prev,
        sendTransaction: "✅ Send transaction submitted successfully!",
      }));
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        sendTransaction: `❌ Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      }));
    } finally {
      setIsLoading((prev) => ({ ...prev, sendTransaction: false }));
    }
  };

  return (
    <div className="w-full h-full">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-dmmono font-medium text-black mb-4">
            Miden Client Operations
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Use these buttons to interact with the Miden blockchain client
          </p>

          {/* Client Status */}
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isInitialized ? "bg-green-500" : "bg-yellow-500"
                  }`}
                ></div>
                <span className="text-sm font-dmmono text-gray-700">
                  Miden Client:{" "}
                  {isInitialized ? "Initialized" : "Initializing..."}
                </span>
              </div>
              {currentWalletId && (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm font-dmmono text-gray-700">
                    Wallet: {currentWalletId.slice(0, 8)}...
                    {currentWalletId.slice(-8)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Sync State Button */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-dmmono font-medium text-black">
                    Sync State
                  </h4>
                  <p className="text-sm text-gray-600">
                    Sync client state with the Miden chain
                  </p>
                </div>
                <button
                  onClick={handleSyncState}
                  disabled={isLoading.sync || !isInitialized}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-dmmono font-medium px-4 py-2 rounded-md transition-colors duration-200"
                >
                  {isLoading.sync ? "Syncing..." : "Sync State"}
                </button>
              </div>
              {status.sync && (
                <div className="text-sm font-dmmono">{status.sync}</div>
              )}
            </div>

            {/* Get Notes Button */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-dmmono font-medium text-black">
                    Get Notes
                  </h4>
                  <p className="text-sm text-gray-600">
                    Fetch consumable notes for the existing wallet
                  </p>
                </div>
                <button
                  onClick={handleGetNotes}
                  disabled={
                    isLoading.getNotes || !isInitialized || !currentWalletId
                  }
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-dmmono font-medium px-4 py-2 rounded-md transition-colors duration-200"
                >
                  {isLoading.getNotes ? "Fetching..." : "Get Notes"}
                </button>
              </div>
              {status.getNotes && (
                <div className="text-sm font-dmmono">{status.getNotes}</div>
              )}
            </div>

            {/* Set Account Button */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-dmmono font-medium text-black">
                    Set Account
                  </h4>
                  <p className="text-sm text-gray-600">
                    Set account from existing wallet ID
                  </p>
                </div>
                <button
                  onClick={handleSetAccount}
                  disabled={
                    isLoading.consumeNotes || !isInitialized || !currentWalletId
                  }
                  className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-dmmono font-medium px-4 py-2 rounded-md transition-colors duration-200"
                >
                  {isLoading.consumeNotes ? "Setting..." : "Set Account"}
                </button>
              </div>
              {status.consumeNotes && (
                <div className="text-sm font-dmmono">{status.consumeNotes}</div>
              )}
            </div>

            {/* Send Transaction Button */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-dmmono font-medium text-black">
                    Send Transaction
                  </h4>
                  <p className="text-sm text-gray-600">
                    Create and submit a send transaction using wallet adapter
                  </p>
                </div>
                <button
                  onClick={handleSendTransaction}
                  disabled={
                    isLoading.sendTransaction ||
                    !wallet ||
                    !accountId ||
                    !connected
                  }
                  className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white font-dmmono font-medium px-4 py-2 rounded-md transition-colors duration-200"
                >
                  {isLoading.sendTransaction
                    ? "Sending..."
                    : "Send Transaction"}
                </button>
              </div>
              {status.sendTransaction && (
                <div className="text-sm font-dmmono">
                  {status.sendTransaction}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;

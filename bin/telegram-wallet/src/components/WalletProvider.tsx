'use client';

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { MidenClient } from '@miden-sdk/miden-sdk';
import type { Signer } from '@openzeppelin/miden-multisig-client';
import {
  CONFIG_ERRORS,
  MIDEN_DB_NAME,
  MIDEN_NOTE_TRANSPORT_URL,
  MIDEN_PROVER_URL,
  MIDEN_RPC_URL,
} from '@/config/psm';
import { assertConfigured, deleteDatabase, startWithStoreReset } from '@/lib/clientStartup';
import {
  createMultisigClient,
  createWalletAccount,
  loadWalletAccount,
  registerAccountNoteTag,
  registerAccountOnNode,
} from '@/lib/multisigApi';
import { storage } from '@/lib/storage';
import { WalletEngine, type WalletSnapshot } from '@/lib/walletEngine';

// Refresh balances and incoming notes while the app is open and visible.
const REFRESH_INTERVAL_MS = 20_000;

async function startMidenClient(): Promise<MidenClient> {
  assertConfigured(CONFIG_ERRORS);
  // A local store left by an older SDK can stop the client from starting:
  // it is only a cache of chain data, so reset it once and retry.
  return startWithStoreReset(
    () => MidenClient.create({
      rpcUrl: MIDEN_RPC_URL,
      noteTransportUrl: MIDEN_NOTE_TRANSPORT_URL,
      proverUrl: MIDEN_PROVER_URL,
      storeName: MIDEN_DB_NAME,
    }),
    () => deleteDatabase(MIDEN_DB_NAME),
    (error) => console.warn('Miden client failed to start; resetting its local data and retrying.', error),
  );
}

interface WalletContextValue {
  engine: WalletEngine<MidenClient, ReturnType<typeof createMultisigClient>>;
  snapshot: WalletSnapshot;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ signer, children }: { signer: Signer; children: ReactNode }) {
  const engine = useMemo(() => new WalletEngine({
    signer,
    startMidenClient,
    createMultisigClient,
    createAccount: createWalletAccount,
    loadAccount: loadWalletAccount,
    registerOnNode: (client, accountId) => registerAccountOnNode(client, accountId),
    registerNoteTag: registerAccountNoteTag,
    storage,
  }), [signer]);
  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);

  useEffect(() => {
    void engine.start();
  }, [engine]);

  const ready = snapshot.phase.kind === 'ready';
  useEffect(() => {
    if (!ready) return;
    const tick = () => {
      if (document.visibilityState !== 'visible' || engine.getSnapshot().activity) return;
      engine.refresh().catch((error) => console.warn('Background refresh failed', error));
    };
    const timer = setInterval(tick, REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [engine, ready]);

  return <WalletContext.Provider value={{ engine, snapshot }}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const value = useContext(WalletContext);
  if (!value) throw new Error('useWallet must be used inside WalletProvider');
  return value;
}

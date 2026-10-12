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
import { createPrivateNotes } from '@/lib/privateSend';
import { reportDiag } from '@/lib/remoteDiag';
import { viewKeyFor } from '@/lib/savedView';
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

// Stands in until the real key is ready: the engine then only shows the saved view.
const NO_SIGNER = { commitment: '' } as unknown as Signer;

/**
 * The wallet engine for the screens. Until `signer` is ready (Telegram and
 * Privy still starting) it shows this user's saved home view and does
 * nothing else; the screens stay mounted when the real engine takes over.
 */
export function WalletProvider({ signer, children }: { signer: Signer | null; children: ReactNode }) {
  const engine = useMemo(() => new WalletEngine({
    signer: signer ?? NO_SIGNER,
    viewKey: viewKeyFor(signer),
    startMidenClient,
    createMultisigClient,
    createAccount: createWalletAccount,
    loadAccount: loadWalletAccount,
    registerOnNode: (client, accountId) => registerAccountOnNode(client, accountId),
    registerNoteTag: registerAccountNoteTag,
    createPrivateNotes,
    storage,
    trace: (label, ms) => {
      if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_REMOTE_DIAGNOSTICS !== '1') return;
      console.info(`[wallet] ${label}: ${ms} ms`);
      reportDiag('timing', `${label}: ${ms} ms`);
    },
  }), [signer]);
  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);
  // Development builds: the engine on window, for inspecting state in the console.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') (window as { midenWallet?: unknown }).midenWallet = engine;
  }, [engine]);

  useEffect(() => {
    if (signer) void engine.start();
  }, [engine, signer]);
  useEffect(() => {
    if (snapshot.phase.kind === 'error') reportDiag('wallet.start', snapshot.phase.message);
  }, [snapshot.phase]);

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

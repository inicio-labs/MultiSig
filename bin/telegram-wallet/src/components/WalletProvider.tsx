'use client';

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { MidenClient } from '@miden-sdk/miden-sdk';
import { IndexedDbSessionKeyStore, type Signer } from '@openzeppelin/miden-multisig-client';
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
import { setSessionStatus } from '@/lib/sessionStatus';
import { storage } from '@/lib/storage';
import { WalletEngine, type WalletSnapshot } from '@/lib/walletEngine';

// The Guardian session key, kept on this phone (non-extractable) so reopening
// within its lifetime (at most 8 h on Guardian) needs no wallet signature.
const SESSION_STORE = typeof indexedDB === 'undefined' ? undefined : new IndexedDbSessionKeyStore('privpay-guardian-session-keys');
const RESUME_TIMEOUT_MS = 2_000;

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
    startSession: async (client) => {
      if (!signer || !SESSION_STORE) return;
      // Expired, revoked or rejected: requests go back to the wallet; a new
      // session starts on the next open.
      const onEnded = (reason: string) => {
        console.info('Guardian session ended:', reason);
        reportDiag('session.ended', reason);
        setSessionStatus({ state: 'ended', reason });
      };
      // Resuming is quick and saves the wallet a signature per read: wait for
      // it, but never hold the start on it (a blocked IndexedDB never answers).
      const resumed = await Promise.race([
        client.resumeSession(signer, SESSION_STORE, { onEnded }).catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), RESUME_TIMEOUT_MS)),
      ]);
      if (resumed) {
        setSessionStatus({ state: 'active', expiresAt: resumed.expiresAt });
        return 'resumed';
      }
      setSessionStatus({ state: 'starting' });
      // Starting one takes a few seconds: let the account load meanwhile (its
      // first reads are wallet-signed) and use the session once it is up.
      void client.startSession(signer, {
        store: SESSION_STORE,
        onEnded,
        // Required for wallets that sign a bare hash, so a person can check the
        // grant first. Privy's embedded wallet signs silently here: there is
        // no one to show it to, and the grant names this site.
        confirm: () => true,
      }).then(
        (session) => setSessionStatus({ state: 'active', expiresAt: session.expiresAt }),
        (error: unknown) => {
          console.warn('No Guardian session; the wallet signs requests', error);
          setSessionStatus({ state: 'off', reason: error instanceof Error ? error.message : String(error) });
        },
      );
      return 'starting';
    },
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

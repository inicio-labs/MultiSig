'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import {
  type Multisig,
  type MultisigClient,
  type AccountState,
  type DetectedMultisigConfig,
  type Proposal,
  type SignatureScheme,
  type ProcedureThreshold,
  type ParaSigningContext,
  AccountInspector,
} from '@openzeppelin/miden-multisig-client';
import { GuardianHttpError } from '@openzeppelin/guardian-client';
import type { MidenClient } from '@miden-sdk/miden-sdk';

import { normalizeCommitment } from '@/lib/helpers';
import { formatError, classifyWalletError } from '@/lib/errors';
import { clearMidenDatabase, createMidenClient, initializeSigner as initSigner, loadSignerKeys, saveSignerKeys } from '@/lib/initClient';
import {
  initMultisigClient,
  createMultisigAccount,
  loadMultisigAccount,
  createSigner,
  registerAccountNoteTag,
} from '@/lib/multisigApi';
import type { ExternalSignerParams } from '@/lib/multisigApi';
import { GUARDIAN_ENDPOINT } from '@/config/psm';
import type { SignerInfo } from '@/types/psm';
import type { WalletSource } from '@/wallets/types';
import { useParaSession } from '@/hooks/useParaSession';
import { useMidenWallet } from '@/hooks/useMidenWallet';
import { MidenWalletAdapter } from '@demox-labs/miden-wallet-adapter-miden';

function isPendingCandidateError(error: unknown): boolean {
  const errorStr = error instanceof Error ? error.message : String(error);
  return (
    errorStr.includes('non-canonical delta pending') ||
    errorStr.includes('ConflictPendingDelta')
  );
}

// Guardian is eventually consistent after pushDelta — it can keep returning an
// executed proposal as 'pending' with full cosigner signatures for a while.
// fromDelta then maps that to 'ready', which puts the already-executed proposal
// back in PENDING ACTIONS with an EXECUTE button. Persist executed proposal IDs
// locally so we can pin them to 'finalized' across reloads and sync clicks.
const EXECUTED_PROPOSALS_KEY = 'executedProposalIds';

function getExecutedIds(accountId: string | null | undefined): Set<string> {
  if (typeof window === 'undefined' || !accountId) return new Set();
  try {
    const raw = localStorage.getItem(`${EXECUTED_PROPOSALS_KEY}:${accountId.toLowerCase()}`);
    if (!raw) return new Set();
    return new Set((JSON.parse(raw) as string[]).map(id => id.toLowerCase()));
  } catch {
    return new Set();
  }
}

function addExecutedId(accountId: string, proposalId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = `${EXECUTED_PROPOSALS_KEY}:${accountId.toLowerCase()}`;
    const existing = getExecutedIds(accountId);
    existing.add(proposalId.toLowerCase());
    localStorage.setItem(key, JSON.stringify(Array.from(existing)));
  } catch { /* quota / storage unavailable — non-fatal */ }
}

function applyExecutedOverride<T extends { id: string; status: string }>(
  proposals: T[],
  accountId: string | null | undefined,
): T[] {
  const executed = getExecutedIds(accountId);
  if (executed.size === 0) return proposals;
  return proposals.map(p =>
    executed.has(p.id.toLowerCase()) ? { ...p, status: 'finalized' } : p
  );
}

interface MultisigContextValue {
  // Core state
  midenClient: MidenClient | null;
  multisigClient: MultisigClient | null;
  signer: SignerInfo | null;
  multisig: Multisig | null;
  error: string | null;
  pendingCandidateWarning: string | null;

  // Guardian state
  guardianUrl: string;
  guardianStatus: 'connected' | 'connecting' | 'error';
  guardianCommitment: string;
  guardianPublicKey: string | undefined;
  guardianState: AccountState | null;

  // Multisig data
  detectedConfig: DetectedMultisigConfig | null;
  proposals: Proposal[];
  consumableNotes: Array<{ id: string; assets: Array<{ faucetId: string; amount: bigint }> }>;

  // Wallet state
  walletSource: WalletSource;
  activeCommitment: string | null;
  activeScheme: SignatureScheme;
  paraSession: { connected: boolean; commitment: string | null; publicKey: string | null };
  midenWalletSession: { connected: boolean; commitment: string | null };

  // Loading flags
  creating: boolean;
  registeringOnGuardian: boolean;
  loadingAccount: boolean;
  syncingState: boolean;
  creatingProposal: boolean;
  signingProposal: string | null;
  executingProposal: string | null;
  generatingSigner: boolean;

  // Operations
  handleCreate: (
    otherSignerCommitments: string[],
    threshold: number,
    procedureThresholds?: ProcedureThreshold[],
    signatureScheme?: SignatureScheme,
  ) => Promise<void>;
  handleLoad: (accountId: string, signatureScheme?: SignatureScheme) => Promise<void>;
  handleSync: () => Promise<void>;
  handleSignProposal: (proposalId: string) => Promise<void>;
  handleExecuteProposal: (proposalId: string) => Promise<void>;
  handleCreateP2idProposal: (recipientId: string, faucetId: string, amount: bigint) => Promise<void>;
  handleCreateConsumeNotesProposal: (noteIds: string[]) => Promise<void>;
  handleCreateAddSignerProposal: (commitment: string, increaseThreshold: boolean) => Promise<void>;
  handleCreateRemoveSignerProposal: (signerToRemove: string, newThreshold?: number) => Promise<void>;
  handleCreateChangeThresholdProposal: (newThreshold: number) => Promise<void>;
  handleCreateSwitchGuardianProposal: (newEndpoint: string, newPubkey: string) => Promise<void>;
  handleExportProposal: (proposalId: string) => void;
  handleSignProposalOffline: (proposalId: string) => Promise<void>;
  handleImportProposal: (json: string) => Promise<void>;
  handleDisconnect: () => void;
  setWalletSource: (source: WalletSource) => void;
  setGuardianUrl: (url: string) => void;
  connectToGuardian: (url: string) => Promise<void>;
  dismissWarning: () => void;
  setError: (error: string | null) => void;

  // Wallet actions
  connectMidenWallet: () => Promise<void>;
  disconnectMidenWallet: () => Promise<void>;
  openParaModal: () => void;
  paraModalOpen: boolean;
  closeParaModal: () => void;

  // Deprecated aliases for backwards compatibility
  /** @deprecated Use guardianUrl */
  psmUrl: string;
  /** @deprecated Use guardianStatus */
  psmStatus: 'connected' | 'connecting' | 'error';
  /** @deprecated Use connectToGuardian */
  connectToPsm: (url: string) => Promise<void>;
  /** @deprecated Use setGuardianUrl */
  setPsmUrl: (url: string) => void;
  /** @deprecated Use handleCreateP2idProposal */
  handleCreateSendProposal: (recipientId: string, faucetId: string, amount: bigint) => Promise<void>;
  /** @deprecated Use handleCreateSwitchGuardianProposal */
  handleCreateSwitchPsmProposal: (newEndpoint: string, newPubkey: string) => Promise<void>;
  /** @deprecated Use registeringOnGuardian */
  registeringOnPsm: boolean;
}

const MultisigContext = createContext<MultisigContextValue | null>(null);

export function useMultisig(): MultisigContextValue {
  const ctx = useContext(MultisigContext);
  if (!ctx) throw new Error('useMultisig must be used within MultisigProvider');
  return ctx;
}

export function MultisigProvider({ children }: { children: React.ReactNode }) {
  const [midenClient, setMidenClient] = useState<MidenClient | null>(null);
  const [multisigClient, setMultisigClient] = useState<MultisigClient | null>(null);
  const [signer, setSigner] = useState<SignerInfo | null>(null);
  const [generatingSigner, setGeneratingSigner] = useState(false);
  const [multisig, setMultisig] = useState<Multisig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingCandidateWarning, setPendingCandidateWarning] = useState<string | null>(null);

  const [guardianUrl, setGuardianUrl] = useState(GUARDIAN_ENDPOINT);
  const [guardianStatus, setGuardianStatus] = useState<'connected' | 'connecting' | 'error'>('connecting');
  const [guardianCommitment, setGuardianCommitment] = useState('');
  const [guardianPublicKey, setGuardianPublicKey] = useState<string | undefined>(undefined);
  const [guardianState, setGuardianState] = useState<AccountState | null>(null);

  const [creating, setCreating] = useState(false);
  const [registeringOnGuardian, setRegisteringOnGuardian] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [detectedConfig, setDetectedConfig] = useState<DetectedMultisigConfig | null>(null);
  const [syncingState, setSyncingState] = useState(false);

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [creatingProposal, setCreatingProposal] = useState(false);
  const [signingProposal, setSigningProposal] = useState<string | null>(null);
  const [executingProposal, setExecutingProposal] = useState<string | null>(null);

  const [consumableNotes, setConsumableNotes] = useState<Array<{ id: string; assets: Array<{ faucetId: string; amount: bigint }> }>>([]);

  const [walletSource, setWalletSource] = useState<WalletSource>('miden-wallet');
  const [paraModalOpen, setParaModalOpen] = useState(false);

  const { session: paraSession, paraClient, getWalletId } = useParaSession();
  const [midenWalletAdapter, setMidenWalletAdapter] = useState(() => new MidenWalletAdapter({ appName: 'Miden Multisig' }));
  const { session: midenWalletSession, connect: connectMidenWalletRaw, disconnect: disconnectMidenWalletRaw, signBytes, connectError: midenWalletConnectError } = useMidenWallet(midenWalletAdapter);

  useEffect(() => {
    if (midenWalletConnectError) {
      toast.error(midenWalletConnectError);
    }
  }, [midenWalletConnectError]);

  useEffect(() => {
    if (paraSession.connected) {
      setWalletSource('para');
      if (paraModalOpen) setParaModalOpen(false);
    }
  }, [paraSession.connected, paraModalOpen]);

  useEffect(() => {
    if (midenWalletSession.connected) {
      setWalletSource('miden-wallet');
    }
  }, [midenWalletSession.connected]);

  // Attempt to auto-connect external wallets on mount
  useEffect(() => {
    const savedSource = localStorage.getItem('currentWalletSource');
    if (savedSource === 'miden-wallet') {
      connectMidenWalletRaw().catch(() => {
        // Silently ignore auto-connect failures
      });
    }
  }, [connectMidenWalletRaw]);

  const activeCommitment = useMemo(() => {
    if (walletSource === 'para' && paraSession.connected) return paraSession.commitment;
    if (walletSource === 'miden-wallet' && midenWalletSession.connected) return midenWalletSession.commitment;
    if (!signer) return null;
    return signer.activeScheme === 'ecdsa' ? signer.ecdsa.commitment : signer.falcon.commitment;
  }, [walletSource, paraSession, midenWalletSession, signer]);

  const activeScheme = useMemo((): SignatureScheme => {
    if (walletSource === 'para') return 'ecdsa';
    if (walletSource === 'miden-wallet' && midenWalletSession.scheme) return midenWalletSession.scheme;
    return signer?.activeScheme ?? 'falcon';
  }, [walletSource, midenWalletSession, signer]);

  const buildExternalParams = useCallback((): ExternalSignerParams | undefined => {
    if (walletSource === 'para' && paraSession.connected && paraClient) {
      const walletId = getWalletId();
      if (!walletId || !paraSession.commitment || !paraSession.publicKey) return undefined;
      return {
        walletSource: 'para',
        paraContext: {
          para: paraClient as ParaSigningContext,
          walletId,
          commitment: paraSession.commitment,
          publicKey: paraSession.publicKey,
        },
      };
    }
    if (walletSource === 'miden-wallet' && midenWalletSession.connected) {
      if (!midenWalletSession.commitment || !midenWalletSession.scheme) return undefined;
      return {
        walletSource: 'miden-wallet',
        midenWalletContext: {
          wallet: { signBytes },
          commitment: midenWalletSession.commitment,
          scheme: midenWalletSession.scheme,
        },
      };
    }
    return undefined;
  }, [walletSource, paraSession, paraClient, getWalletId, midenWalletSession, signBytes]);

  const connectToGuardian = useCallback(
    async (url: string, clientParam?: MidenClient): Promise<void> => {
      setGuardianStatus('connecting');
      setError(null);
      try {
        const mc = clientParam ?? midenClient;
        if (!mc) {
          // No MidenClient yet — fetch pubkey directly from Guardian HTTP API
          const { GuardianHttpClient } = await import('@openzeppelin/guardian-client');
          const guardianHttp = new GuardianHttpClient(url);
          const pubkeyResp = await guardianHttp.getPubkey();
          setGuardianCommitment(pubkeyResp.commitment ?? '');
          setGuardianPublicKey(pubkeyResp.pubkey);
          setGuardianStatus('connected');
          return;
        }

        const { client: msClient, guardianCommitment: commitment, guardianPubkey: pubkey } =
          await initMultisigClient(mc, url);
        setGuardianCommitment(commitment);
        setGuardianPublicKey(pubkey);
        setMultisigClient(msClient);
        setGuardianStatus('connected');

        if (multisig && signer && guardianState?.stateDataBase64) {
          setRegisteringOnGuardian(true);
          try {
            const clientSigner = createSigner(signer, signer.activeScheme, buildExternalParams());
            const reloadedMs = await loadMultisigAccount(msClient, multisig.accountId, clientSigner);
            setMultisig(reloadedMs);

            const [synced, state, notes] = await Promise.all([
              reloadedMs.syncProposals(),
              reloadedMs.syncState(),
              reloadedMs.getConsumableNotes(),
            ]);
            const config = AccountInspector.fromAccount(reloadedMs.account);
            setGuardianState(state);
            setDetectedConfig(config);
            setProposals(applyExecutedOverride(synced, reloadedMs.accountId));
            setConsumableNotes(notes);
            toast.success('Account loaded from Guardian');
          } catch (loadErr) {
            const isNotFound = loadErr instanceof GuardianHttpError && loadErr.status === 404;
            const isNonceTooLow = loadErr instanceof Error && loadErr.message.includes('nonce') && loadErr.message.includes('too low');

            if (isNotFound || isNonceTooLow) {
              try {
                multisig.setGuardianClient(msClient.guardianClient);
                const [synced, state, notes] = await Promise.all([
                  multisig.syncProposals(),
                  multisig.syncState(),
                  multisig.getConsumableNotes(),
                ]);
                const config = AccountInspector.fromAccount(multisig.account);
                setGuardianState(state);
                setDetectedConfig(config);
                setProposals(applyExecutedOverride(synced, multisig.accountId));
                setConsumableNotes(notes);
                toast.success('Account registered on new Guardian');
              } catch (registerErr) {
                setError(`Failed to register account on new Guardian: ${formatError(registerErr)}`);
              }
            } else {
              setError(`Failed to load account from Guardian: ${formatError(loadErr)}`);
            }
          } finally {
            setRegisteringOnGuardian(false);
          }
        }
      } catch (err) {
        const msg = formatError(err);
        setGuardianStatus('error');
        setGuardianCommitment('');
        setGuardianPublicKey(undefined);
        setError(`Failed to connect to Guardian: ${msg}`);
      }
    },
    [midenClient, multisig, signer, guardianState, buildExternalParams]
  );

  // Initialization
  useEffect(() => {
    const init = async () => {
      try {
        await clearMidenDatabase();

        const client = await createMidenClient();
        setMidenClient(client);

        await connectToGuardian(guardianUrl, client);

        setGeneratingSigner(true);
        let signerInfo = await loadSignerKeys();
        if (!signerInfo) {
          signerInfo = initSigner();
          await saveSignerKeys(signerInfo);
        }
        setSigner(signerInfo);
      } catch (err) {
        setError(formatError(err, 'Initialization failed'));
      } finally {
        setGeneratingSigner(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = useCallback(async (
    otherSignerCommitments: string[],
    threshold: number,
    procedureThresholds?: ProcedureThreshold[],
    signatureScheme: SignatureScheme = 'falcon',
  ) => {
    if (!multisigClient || !signer || !guardianCommitment) {
      const msg = 'Client not initialized. Try reconnecting to Guardian.';
      setError(msg);
      throw new Error(msg);
    }

    setCreating(true);
    setError(null);
    try {
      setSigner((prev) => (prev ? { ...prev, activeScheme: signatureScheme } : prev));
      let ackPublicKey = guardianPublicKey;
      let accountGuardianCommitment = guardianCommitment;
      if (signatureScheme === 'ecdsa') {
        const pubkeyResp = await multisigClient.guardianClient.getPubkey('ecdsa');
        if (!ackPublicKey) {
          ackPublicKey = pubkeyResp.pubkey;
          setGuardianPublicKey(pubkeyResp.pubkey);
        }
        accountGuardianCommitment = pubkeyResp.commitment;
        setGuardianCommitment(pubkeyResp.commitment);
      }

      const externalParams = buildExternalParams();
      const clientSigner = createSigner(signer, signatureScheme, externalParams);
      const signerCommitment = externalParams?.paraContext?.commitment
        ?? externalParams?.midenWalletContext?.commitment
        ?? (signatureScheme === 'ecdsa' ? signer.ecdsa.commitment : signer.falcon.commitment);

      const ms = await createMultisigAccount(
        multisigClient,
        signerCommitment,
        otherSignerCommitments,
        threshold,
        accountGuardianCommitment,
        clientSigner,
        ackPublicKey,
        procedureThresholds,
        signatureScheme
      );
      setMultisig(ms);

      // Persist account ID so middleware allows dashboard access
      if (ms.accountId) {
        localStorage.setItem('currentWalletId', ms.accountId);
        localStorage.setItem('currentWalletSource', walletSource);
        localStorage.setItem('currentWalletScheme', signatureScheme);
        document.cookie = `currentWalletId=${ms.accountId}; path=/; max-age=31536000`;
      }

      setRegisteringOnGuardian(true);
      try {
        await ms.registerOnGuardian();
        if (midenClient && ms.accountId) {
          try { await registerAccountNoteTag(midenClient, ms.accountId); } catch { /* tag may already exist */ }
          try { await midenClient.sync(); } catch { /* non-fatal */ }
          try { await midenClient.notes.fetchPrivate({ mode: 'all' }); } catch { /* no private notes or transport unavailable */ }
        }
        const [synced, state, notes] = await Promise.all([
          ms.syncProposals(),
          ms.syncState(),
          ms.getConsumableNotes(),
        ]);
        const config = AccountInspector.fromAccount(ms.account);
        setDetectedConfig(config);
        setGuardianState(state);
        setProposals(applyExecutedOverride(synced, ms.accountId));
        setConsumableNotes(notes);
      } catch (guardianErr) {
        setError(`Created but failed to register on Guardian: ${guardianErr instanceof Error ? guardianErr.message : 'Unknown'}`);
      } finally {
        setRegisteringOnGuardian(false);
      }
    } catch (err) {
      if (walletSource !== 'local') {
        setError(classifyWalletError(err));
      } else {
        setError(formatError(err, 'Failed to create'));
      }
      throw err;
    } finally {
      setCreating(false);
    }
  }, [multisigClient, signer, guardianCommitment, guardianPublicKey, walletSource, buildExternalParams]);

  const handleLoad = useCallback(async (accountId: string, signatureScheme: SignatureScheme = 'falcon') => {
    if (!multisigClient || !signer) {
      setError('Client not initialized. Try reconnecting to Guardian.');
      return;
    }
    if (!guardianCommitment) {
      setGuardianStatus('error');
      setError('Not connected to Guardian. Check the endpoint and try again.');
      return;
    }

    let normalizedId = accountId;
    if (!normalizedId.startsWith('0x')) {
      normalizedId = `0x${normalizedId}`;
    }

    setLoadingAccount(true);
    setError(null);
    setDetectedConfig(null);
    try {
      setSigner((prev) => (prev ? { ...prev, activeScheme: signatureScheme } : prev));

      const externalParams = buildExternalParams();
      const clientSigner = createSigner(signer, signatureScheme, externalParams);

      const ms = await loadMultisigAccount(multisigClient, normalizedId, clientSigner);
      setMultisig(ms);

      // Persist account ID so middleware allows dashboard access
      if (ms.accountId) {
        localStorage.setItem('currentWalletId', ms.accountId);
        localStorage.setItem('currentWalletSource', walletSource);
        localStorage.setItem('currentWalletScheme', signatureScheme);
        document.cookie = `currentWalletId=${ms.accountId}; path=/; max-age=31536000`;
      }

      if (midenClient && ms.accountId) {
        try { await registerAccountNoteTag(midenClient, ms.accountId); } catch { /* tag may already exist */ }
        try { await midenClient.sync(); } catch { /* non-fatal */ }
        try { await midenClient.notes.fetchPrivate({ mode: 'all' }); } catch { /* no private notes or transport unavailable */ }
      }

      const [synced, state, notes] = await Promise.all([
        ms.syncProposals(),
        ms.syncState(),
        ms.getConsumableNotes(),
      ]);
      const config = AccountInspector.fromAccount(ms.account);
      setDetectedConfig(config);
      setGuardianState(state);
      setProposals(applyExecutedOverride(synced, ms.accountId));
      setConsumableNotes(notes);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown';
      if (message.includes('404') || message.includes('not found')) {
        setError('Account not found on Guardian');
      } else {
        setError(`Failed to load: ${message}`);
      }
    } finally {
      setLoadingAccount(false);
    }
  }, [multisigClient, signer, guardianCommitment, walletSource, buildExternalParams, midenClient]);

  // Auto-load saved account after initialization completes
  const autoLoadAttemptedRef = useRef(false);
  useEffect(() => {
    if (autoLoadAttemptedRef.current) return;
    if (!multisigClient || !signer || !guardianCommitment) return;

    const savedId = localStorage.getItem('currentWalletId');
    if (!savedId) return;

    const savedSource = localStorage.getItem('currentWalletSource') as WalletSource | null;
    const savedScheme = localStorage.getItem('currentWalletScheme') as SignatureScheme | null;

    if (savedSource === 'para' && !paraSession.connected) return;
    if (savedSource === 'miden-wallet' && !midenWalletSession.connected) return;
    autoLoadAttemptedRef.current = true;

    if (savedSource && savedSource !== walletSource) {
      setWalletSource(savedSource);
    }

    setTimeout(() => {
      handleLoad(savedId, savedScheme ?? 'falcon');
    }, 100);
  }, [multisigClient, signer, guardianCommitment, handleLoad, paraSession.connected, midenWalletSession.connected, walletSource]);

  const handleSync = useCallback(async () => {
    if (!multisig || !midenClient) return;

    setSyncingState(true);
    setError(null);
    setPendingCandidateWarning(null);
    try {
      if (multisig.accountId) {
        try { await registerAccountNoteTag(midenClient, multisig.accountId); } catch { /* tag may already exist */ }
      }
      try {
        await midenClient.sync();
      } catch {
        await new Promise(resolve => setTimeout(resolve, 500));
        await midenClient.sync();
      }
      try { await midenClient.notes.fetchPrivate({ mode: 'all' }); } catch { /* no private notes or transport unavailable */ }

      const [synced, state, notes] = await Promise.all([
        multisig.syncProposals(),
        multisig.syncState(),
        multisig.getConsumableNotes(),
      ]);
      const config = AccountInspector.fromAccount(multisig.account);
      setGuardianState(state);
      setDetectedConfig(config);
      setProposals(applyExecutedOverride(synced, multisig.accountId));
      setConsumableNotes(notes);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('account nonce is too low to import')) {
        setPendingCandidateWarning(
          'Sync warning: local state is ahead of the on-chain state. ' +
          'This can happen right after executing a transaction. Please wait a moment and sync again.'
        );
        setError(null);
      } else {
        setError(formatError(err, 'Sync failed'));
      }
    } finally {
      setSyncingState(false);
    }
  }, [multisig, midenClient]);

  const handleCreateAddSignerProposal = useCallback(async (commitment: string, increaseThreshold: boolean) => {
    if (!multisig) return;

    let normalizedCommitment: string;
    try {
      normalizedCommitment = normalizeCommitment(commitment);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid commitment');
      return;
    }

    setCreatingProposal(true);
    setError(null);
    setPendingCandidateWarning(null);
    try {
      const newThreshold = increaseThreshold ? multisig.threshold + 1 : undefined;
      await multisig.createAddSignerProposal(normalizedCommitment, undefined, newThreshold);
      setProposals(multisig.listProposals());
      toast.success('Add signer proposal created');
    } catch (err) {
      if (isPendingCandidateError(err)) {
        setPendingCandidateWarning(
          'A previous transaction is still being processed on-chain. ' +
          'Please wait for it to be confirmed before creating new proposals.'
        );
      } else {
        setError(`Failed to create proposal: ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    } finally {
      setCreatingProposal(false);
    }
  }, [multisig]);

  const handleCreateRemoveSignerProposal = useCallback(async (signerToRemove: string, newThreshold?: number) => {
    if (!multisig) return;

    setCreatingProposal(true);
    setError(null);
    setPendingCandidateWarning(null);
    try {
      await multisig.createRemoveSignerProposal(signerToRemove, undefined, newThreshold);
      setProposals(multisig.listProposals());
      toast.success('Remove signer proposal created');
    } catch (err) {
      if (isPendingCandidateError(err)) {
        setPendingCandidateWarning(
          'A previous transaction is still being processed on-chain. ' +
          'Please wait for it to be confirmed before creating new proposals.'
        );
      } else {
        setError(`Failed to create proposal: ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    } finally {
      setCreatingProposal(false);
    }
  }, [multisig]);

  const handleCreateChangeThresholdProposal = useCallback(async (newThreshold: number) => {
    if (!multisig) return;

    setCreatingProposal(true);
    setError(null);
    setPendingCandidateWarning(null);
    try {
      await multisig.createChangeThresholdProposal(newThreshold);
      setProposals(multisig.listProposals());
      toast.success('Change threshold proposal created');
    } catch (err) {
      if (isPendingCandidateError(err)) {
        setPendingCandidateWarning(
          'A previous transaction is still being processed on-chain. ' +
          'Please wait for it to be confirmed before creating new proposals.'
        );
      } else {
        setError(`Failed to create proposal: ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    } finally {
      setCreatingProposal(false);
    }
  }, [multisig]);

  const handleCreateConsumeNotesProposal = useCallback(async (noteIds: string[]) => {
    if (!multisig) return;

    setCreatingProposal(true);
    setError(null);
    setPendingCandidateWarning(null);
    try {
      await multisig.createConsumeNotesProposal(noteIds);
      setProposals(multisig.listProposals());
      toast.success('Consume notes proposal created');
    } catch (err) {
      if (isPendingCandidateError(err)) {
        setPendingCandidateWarning(
          'A previous transaction is still being processed on-chain. ' +
          'Please wait for it to be confirmed before creating new proposals.'
        );
      } else {
        setError(`Failed to create proposal: ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    } finally {
      setCreatingProposal(false);
    }
  }, [multisig]);

  const handleCreateP2idProposal = useCallback(async (recipientId: string, faucetId: string, amount: bigint) => {
    if (!multisig) return;

    setCreatingProposal(true);
    setError(null);
    setPendingCandidateWarning(null);
    try {
      await multisig.createP2idProposal(recipientId, faucetId, amount);
      setProposals(multisig.listProposals());
      toast.success('Send payment proposal created');
    } catch (err) {
      if (isPendingCandidateError(err)) {
        setPendingCandidateWarning(
          'A previous transaction is still being processed on-chain. ' +
          'Please wait for it to be confirmed before creating new proposals.'
        );
      } else {
        setError(`Failed to create proposal: ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    } finally {
      setCreatingProposal(false);
    }
  }, [multisig]);

  const handleCreateSwitchGuardianProposal = useCallback(async (newEndpoint: string, newPubkey: string) => {
    if (!multisig) return;

    setCreatingProposal(true);
    setError(null);
    setPendingCandidateWarning(null);
    try {
      await multisig.createSwitchGuardianProposal(newEndpoint, newPubkey);
      setProposals(multisig.listProposals());
      toast.success('Switch Guardian proposal created');
    } catch (err) {
      if (isPendingCandidateError(err)) {
        setPendingCandidateWarning(
          'A previous transaction is still being processed on-chain. ' +
          'Please wait for it to be confirmed before creating new proposals.'
        );
      } else {
        setError(`Failed to create proposal: ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    } finally {
      setCreatingProposal(false);
    }
  }, [multisig]);

  const handleSignProposal = useCallback(async (proposalId: string) => {
    if (!multisig) return;

    setSigningProposal(proposalId);
    setError(null);
    try {
      await multisig.signProposal(proposalId);
      setProposals(multisig.listProposals());
    } catch (err) {
      const message = walletSource !== 'local'
        ? classifyWalletError(err)
        : `Failed to sign: ${err instanceof Error ? err.message : 'Unknown'}`;
      setError(message);
      throw err;
    } finally {
      setSigningProposal(null);
    }
  }, [multisig, walletSource]);

  const handleExecuteProposal = useCallback(async (proposalId: string) => {
    if (!multisig) return;

    setExecutingProposal(proposalId);
    setError(null);
    setPendingCandidateWarning(null);
    try {
      // Align local proposal cache with Guardian before executing. After any
      // previous execute, Guardian's proposal state can diverge from the local
      // cache — re-syncing here ensures getDeltaProposal inside executeProposal
      // finds a current, signed proposal instead of returning 404.
      try {
        await multisig.syncProposals();
        setProposals(multisig.listProposals());
      } catch { /* non-fatal; let execute raise a clearer error */ }

      const fresh = multisig.listProposals().find(p => p.id === proposalId);
      if (!fresh) {
        throw new Error(
          'Proposal no longer exists on Guardian. This usually means the account state ' +
          'has advanced since this proposal was created. Try creating a new proposal.'
        );
      }
      if (fresh.status !== 'ready') {
        throw new Error(
          `Proposal is not ready to execute (status: ${fresh.status}). ` +
          'Make sure enough signers have signed on Guardian.'
        );
      }

      await multisig.executeProposal(proposalId);
      toast.success('Proposal executed successfully');

      // Persist execution locally so reloads and sync-button clicks keep treating
      // this proposal as finalized even if Guardian is slow to transition it.
      addExecutedId(multisig.accountId, proposalId);

      // Sync after execution
      if (midenClient) {
        setSyncingState(true);
        try {
          try {
            await midenClient.sync();
          } catch {
            await new Promise(resolve => setTimeout(resolve, 500));
            await midenClient.sync();
          }
          const [synced, state, notes] = await Promise.all([
            multisig.syncProposals(),
            multisig.syncState(),
            multisig.getConsumableNotes(),
          ]);
          const config = AccountInspector.fromAccount(multisig.account);
          setGuardianState(state);
          setDetectedConfig(config);
          setProposals(applyExecutedOverride(synced, multisig.accountId));
          setConsumableNotes(notes);
        } catch (syncErr) {
          const message = syncErr instanceof Error ? syncErr.message : String(syncErr);
          if (message.includes('account nonce is too low to import')) {
            setPendingCandidateWarning(
              'Sync warning: local state is ahead of the on-chain state. ' +
              'This can happen right after executing a transaction. Please wait a moment and sync again.'
            );
          }
          setProposals(prev => applyExecutedOverride(prev, multisig.accountId));
        } finally {
          setSyncingState(false);
        }
      } else {
        setProposals(prev => applyExecutedOverride(prev, multisig.accountId));
      }
    } catch (err) {
      const message = formatError(err, 'Execute failed');
      if (isPendingCandidateError(err)) {
        setPendingCandidateWarning(
          'A previous transaction is still being processed on-chain. ' +
          'Please wait for it to be confirmed before executing proposals.'
        );
      } else {
        setError(message);
        toast.error(message);
      }
    } finally {
      setExecutingProposal(null);
    }
  }, [multisig, midenClient]);

  const handleExportProposal = useCallback((proposalId: string) => {
    if (!multisig) return;

    try {
      const json = multisig.exportProposalToJson(proposalId);
      navigator.clipboard.writeText(json);
      toast.success('Proposal JSON copied to clipboard');
    } catch (err) {
      setError(`Failed to export: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }, [multisig]);

  const handleSignProposalOffline = useCallback(async (proposalId: string) => {
    if (!multisig) return;

    try {
      const json = await multisig.signProposalOffline(proposalId);
      navigator.clipboard.writeText(json);
      setProposals(multisig.listProposals());
      toast.success('Signed! Updated proposal JSON copied to clipboard');
    } catch (err) {
      setError(`Failed to sign offline: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }, [multisig]);

  const handleImportProposal = useCallback(async (json: string) => {
    if (!multisig || !json.trim()) return;

    try {
      const proposal = await multisig.importProposal(json.trim());
      setProposals(multisig.listProposals());
      toast.success(`Proposal imported: ${proposal.id.slice(0, 12)}...`);
    } catch (err) {
      setError(`Failed to import: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }, [multisig]);

  const handleDisconnect = useCallback(() => {
    setMultisig(null);
    setGuardianState(null);
    setProposals([]);
    setError(null);
    setDetectedConfig(null);
    setConsumableNotes([]);
  }, []);

  const connectMidenWallet = useCallback(async () => {
    try {
      await connectMidenWalletRaw();
    } catch (err) {
      toast.error(classifyWalletError(err));
    }
  }, [connectMidenWalletRaw]);

  const disconnectMidenWallet = useCallback(async () => {
    await disconnectMidenWalletRaw();
    // Recreate the adapter so the next connect() gets a clean instance —
    // the extension may leave window.midenWallet in a stale state after disconnect.
    setMidenWalletAdapter(new MidenWalletAdapter({ appName: 'Miden Multisig' }));
  }, [disconnectMidenWalletRaw]);

  const value = useMemo((): MultisigContextValue => ({
    midenClient,
    multisigClient,
    signer,
    multisig,
    error,
    pendingCandidateWarning,

    guardianUrl,
    guardianStatus,
    guardianCommitment,
    guardianPublicKey,
    guardianState,

    detectedConfig,
    proposals,
    consumableNotes,

    walletSource,
    activeCommitment,
    activeScheme,
    paraSession: {
      connected: paraSession.connected,
      commitment: paraSession.commitment,
      publicKey: paraSession.publicKey,
    },
    midenWalletSession: {
      connected: midenWalletSession.connected,
      commitment: midenWalletSession.commitment,
    },

    creating,
    registeringOnGuardian,
    loadingAccount,
    syncingState,
    creatingProposal,
    signingProposal,
    executingProposal,
    generatingSigner,

    handleCreate,
    handleLoad,
    handleSync,
    handleSignProposal,
    handleExecuteProposal,
    handleCreateP2idProposal,
    handleCreateConsumeNotesProposal,
    handleCreateAddSignerProposal,
    handleCreateRemoveSignerProposal,
    handleCreateChangeThresholdProposal,
    handleCreateSwitchGuardianProposal,
    handleExportProposal,
    handleSignProposalOffline,
    handleImportProposal,
    handleDisconnect,
    setWalletSource,
    setGuardianUrl,
    connectToGuardian,
    dismissWarning: () => setPendingCandidateWarning(null),
    setError,

    connectMidenWallet,
    disconnectMidenWallet,
    openParaModal: () => setParaModalOpen(true),
    paraModalOpen,
    closeParaModal: () => setParaModalOpen(false),

    // Deprecated aliases
    psmUrl: guardianUrl,
    psmStatus: guardianStatus,
    connectToPsm: connectToGuardian,
    setPsmUrl: setGuardianUrl,
    handleCreateSendProposal: handleCreateP2idProposal,
    handleCreateSwitchPsmProposal: handleCreateSwitchGuardianProposal,
    registeringOnPsm: registeringOnGuardian,
  }), [
    midenClient, multisigClient, signer, multisig, error, pendingCandidateWarning,
    guardianUrl, guardianStatus, guardianCommitment, guardianPublicKey, guardianState,
    detectedConfig, proposals, consumableNotes,
    walletSource, activeCommitment, activeScheme,
    paraSession.connected, paraSession.commitment, paraSession.publicKey,
    midenWalletSession.connected, midenWalletSession.commitment,
    creating, registeringOnGuardian, loadingAccount, syncingState,
    creatingProposal, signingProposal, executingProposal, generatingSigner,
    handleCreate, handleLoad, handleSync,
    handleSignProposal, handleExecuteProposal,
    handleCreateP2idProposal, handleCreateConsumeNotesProposal,
    handleCreateAddSignerProposal, handleCreateRemoveSignerProposal,
    handleCreateChangeThresholdProposal, handleCreateSwitchGuardianProposal,
    handleExportProposal, handleSignProposalOffline, handleImportProposal,
    handleDisconnect, connectToGuardian,
    connectMidenWallet, disconnectMidenWallet, paraModalOpen,
  ]);

  return (
    <MultisigContext.Provider value={value}>
      {children}
    </MultisigContext.Provider>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GuardianHttpError, type HistoryEntry, type ProposalMetadata } from '@openzeppelin/guardian-client';
import type { Multisig } from '@openzeppelin/miden-multisig-client';
import { useMultisig } from '@/contexts/MultisigContext';
import { formatError, isWalletDecline } from '@/lib/errors';
import { retryIfSessionDied } from '@/lib/guardianSession';
import { multisigGuardian } from '@/lib/multisigApi';
import { TIMESTAMP_KEY } from '@/lib/transactionHistory';

const PAGE = 50;
/** The first load reads on past rows keyed by time (0.18.0, see TIMESTAMP_KEY) up to this many rows. */
const FIRST_LOAD_MAX = 500;

export type HistoryStatus = 'idle' | 'approval' | 'loading' | 'ready' | 'error';

interface Loaded {
  accountId: string;
  /** The account nonce the history was read at: a new one means a new transaction. */
  nonce: string;
  entries: HistoryEntry[];
  cursor?: string;
}

/** Kept across pages (Home → Transactions) so the history is not read twice. */
let lastLoaded: Loaded | null = null;
/** Settings rows' proposal metadata by `${accountId}:${key}`; null when Guardian kept none. */
const settingsMetadata = new Map<string, ProposalMetadata | null>();

/** Rows with no notes but the fee: settings changes, whose proposal says what changed. */
function maybeSettings(entry: HistoryEntry): boolean {
  return entry.inputNotes.length === 0
    && entry.outputNotes.every((note) => note.tag === 'custom' && !note.recipient)
    && entry.decodeWarnings.length === 0;
}

async function readFirst(multisig: Multisig): Promise<Pick<Loaded, 'entries' | 'cursor'>> {
  let page = await retryIfSessionDied(() => multisig.deltaHistory({ limit: PAGE }));
  const entries = [...page.entries];
  // Rows keyed by time come first: read on to the first row keyed by nonce,
  // so the latest transactions are in.
  while (page.nextCursor && entries.length < FIRST_LOAD_MAX && entries[entries.length - 1].nonce >= TIMESTAMP_KEY) {
    const cursor = page.nextCursor;
    page = await retryIfSessionDied(() => multisig.deltaHistory({ limit: PAGE, cursor }));
    entries.push(...page.entries);
  }
  return { entries, cursor: page.nextCursor };
}

/** The first read in flight, shared by pages mounted while it runs (Home → Transactions). */
let inflight: { key: string; read: Promise<Pick<Loaded, 'entries' | 'cursor'>> } | null = null;

function readFirstShared(multisig: Multisig, key: string): Promise<Pick<Loaded, 'entries' | 'cursor'>> {
  if (inflight?.key === key) return inflight.read;
  const read = readFirst(multisig).finally(() => {
    if (inflight?.read === read) inflight = null;
  });
  inflight = { key, read };
  return read;
}

function historyError(err: unknown): string {
  if (isWalletDecline(err)) return 'Signature declined.';
  if (err instanceof GuardianHttpError && err.status === 404) return 'Guardian has no history for this account yet.';
  if (/no signer configured/i.test(formatError(err))) return 'Connect a signer of this account to see its history.';
  return formatError(err, "Couldn't load the history");
}

/**
 * The loaded account's executed transactions from Guardian, newest pages
 * first. Each read is signed: with a Guardian session (or a local key) it
 * needs no wallet, and the history loads and refreshes on its own after each
 * new transaction; otherwise every read would ask the wallet (a device
 * approval on Ledger), so it waits for `load` ("approval").
 */
export type TransactionHistoryState = ReturnType<typeof useTransactionHistory>;

export function useTransactionHistory() {
  const { multisig, accountNonce, guardianSession, walletSource } = useMultisig();
  const accountId = multisig?.accountId ?? null;
  const nonce = accountNonce?.toString() ?? '';
  const free = walletSource === 'local' || guardianSession.phase === 'active';
  const settling = guardianSession.phase === 'resuming' || guardianSession.phase === 'starting';

  const [loaded, setLoaded] = useState<Loaded | null>(() => (lastLoaded?.accountId === accountId ? lastLoaded : null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setMetadataRevision] = useState(0);
  const run = useRef(0);
  const attempted = useRef<string | null>(null);

  // Another account: its own history, or nothing yet.
  useEffect(() => {
    run.current++;
    setLoading(false);
    setError(null);
    setLoaded(lastLoaded?.accountId === accountId ? lastLoaded : null);
  }, [accountId]);

  const load = useCallback(async () => {
    if (!multisig) return;
    const id = ++run.current;
    const key = `${multisig.accountId}:${nonce}`;
    attempted.current = key;
    setLoading(true);
    setError(null);
    try {
      const first = await readFirstShared(multisig, key);
      if (run.current !== id) return;
      lastLoaded = { accountId: multisig.accountId, nonce, ...first };
      setLoaded(lastLoaded);
    } catch (err) {
      if (run.current === id) setError(historyError(err));
    } finally {
      if (run.current === id) setLoading(false);
    }
  }, [multisig, nonce]);

  const loadMore = useCallback(async () => {
    if (!multisig || !loaded?.cursor) return;
    const id = ++run.current;
    const cursor = loaded.cursor;
    setLoading(true);
    setError(null);
    try {
      const page = await retryIfSessionDied(() => multisig.deltaHistory({ limit: PAGE, cursor }));
      if (run.current !== id) return;
      lastLoaded = { ...loaded, entries: [...loaded.entries, ...page.entries], cursor: page.nextCursor };
      setLoaded(lastLoaded);
    } catch (err) {
      if (run.current === id) setError(historyError(err));
    } finally {
      if (run.current === id) setLoading(false);
    }
  }, [multisig, loaded]);

  // Without a wallet prompt: on first view and after each new transaction,
  // once per account nonce (a failed read is not retried on its own).
  const current = loaded !== null && loaded.accountId === accountId && loaded.nonce === nonce;
  useEffect(() => {
    if (!multisig || accountNonce === null || !free || settling || current) return;
    if (attempted.current === `${multisig.accountId}:${nonce}`) return;
    void load();
  }, [multisig, accountNonce, free, settling, current, nonce, load]);

  // What each settings change was (one read per row, only without prompts).
  useEffect(() => {
    if (!multisig || !loaded || !free) return;
    const guardian = multisigGuardian(multisig);
    let cancelled = false;
    void (async () => {
      for (const entry of loaded.entries) {
        const key = `${loaded.accountId}:${entry.nonce}`;
        if (!maybeSettings(entry) || settingsMetadata.has(key)) continue;
        try {
          const delta = await retryIfSessionDied(() => guardian.getDelta(loaded.accountId, entry.nonce));
          settingsMetadata.set(key, delta.deltaPayload.metadata ?? null);
        } catch {
          continue; // The row keeps its general title.
        }
        if (cancelled) return;
        setMetadataRevision((revision) => revision + 1);
      }
    })();
    return () => { cancelled = true; };
  }, [multisig, loaded, free]);

  const metadataFor = useCallback(
    (key: number) => (accountId ? settingsMetadata.get(`${accountId}:${key}`) : undefined),
    [accountId],
  );

  const entries = loaded && loaded.accountId === accountId ? loaded.entries : [];
  const status: HistoryStatus = loading
    ? 'loading'
    : error
      ? 'error'
      : loaded && loaded.accountId === accountId
        ? 'ready'
        : multisig && !free && !settling
          ? 'approval'
          : 'idle';

  return {
    /** The account the entries are of. */
    accountId,
    status,
    entries,
    /** More rows on Guardian than loaded. */
    hasMore: Boolean(loaded?.accountId === accountId && loaded?.cursor),
    error,
    /** Reading asks the wallet (no Guardian session). */
    asksWallet: !free,
    /** Read before the account's latest transaction (refreshed on its own only without prompts). */
    stale: Boolean(loaded?.accountId === accountId && accountNonce !== null && loaded?.nonce !== nonce),
    load,
    loadMore,
    metadataFor,
  };
}

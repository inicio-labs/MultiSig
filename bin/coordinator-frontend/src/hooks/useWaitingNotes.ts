'use client';

import { useMemo } from 'react';
import { useMultisig } from '@/contexts/MultisigContext';

/** Consumable notes that no consume proposal covers yet: what Receive offers. */
export function useWaitingNotes() {
  const { consumableNotes, proposals } = useMultisig();

  const proposedNoteIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of proposals ?? []) {
      // Include finalized proposals too: a note can only be consumed once, and
      // the local note store can lag behind on-chain state right after execute
      // (especially under the para/delegated-signing flow), so an already-
      // executed note can briefly still show up from getConsumableNotes().
      if (
        p.metadata.proposalType === 'consume_notes'
        && !(p.verification.status === 'failed' && !p.verification.retryable)
      ) {
        for (const id of p.metadata.noteIds) ids.add(id);
      }
    }
    return ids;
  }, [proposals]);

  return useMemo(
    () => (consumableNotes ?? []).filter((n) => !proposedNoteIds.has(n.id)),
    [consumableNotes, proposedNoteIds],
  );
}

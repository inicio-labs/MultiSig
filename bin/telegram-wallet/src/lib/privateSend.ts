import { Endpoint, Note, RpcClient, type MidenClient, type NoteId, type NoteInclusionProof } from '@miden-sdk/miden-sdk';
import type { Multisig, Proposal } from '@openzeppelin/miden-multisig-client';
import { MIDEN_RPC_URL } from '@/config/psm';
import { getOutputNotesFromTxSummary, latestCanonicalPrivateNotes, noteChainChecks, type LatestPrivateNote } from './multisigApi';
import {
  decodeNote,
  deliverCommittedNotes,
  encodeNote,
  pendingDeliveries,
  recordPendingDelivery,
  removePendingDelivery,
} from './privateDelivery';
import { ensureLatestPrivateNotesDelivered } from './privateNoteGuard';

/**
 * Private sends, for the wallet engine. The note transport only takes a note
 * with its inclusion proof, so a private note is delivered after its
 * transaction commits (privateDelivery.ts), and no later transaction runs
 * while one is undelivered (privateNoteGuard.ts): a private note nobody
 * delivered is money its recipient can never see.
 */
export interface PrivateNotes {
  /** Deliver what earlier private sends left undelivered; throws while one cannot be delivered yet. */
  ensureDelivered(multisig: Multisig): Promise<void>;
  /** A private send made on this device is still waiting to be delivered. */
  hasPending(accountId: string): boolean;
  /** Before executing a private send: keep its notes, so a committed note is always delivered. */
  record(multisig: Multisig, proposal: Proposal): void;
  /** After executing: wait for the notes to commit, then deliver them. */
  deliver(multisig: Multisig, proposal: Proposal): Promise<void>;
  /** The execution never reached Guardian, so it cannot land: nothing to deliver. */
  forget(proposal: Proposal): void;
}

// How long a send waits for its note to commit before leaving delivery to the next check.
const DELIVER_AFTER_SEND_MS = 180_000;
// How long the check before a transaction waits for an earlier note to commit.
const DELIVER_BEFORE_NEXT_MS = 60_000;

async function fetchProof(noteId: NoteId): Promise<NoteInclusionProof | undefined> {
  const rpc = new RpcClient(new Endpoint(MIDEN_RPC_URL));
  try {
    const [fetched] = await rpc.getNotesById([noteId]);
    return fetched?.inclusionProof;
  } finally {
    rpc.free();
  }
}

export function createPrivateNotes(midenClient: MidenClient): PrivateNotes {
  const deliverRecorded = async (accountId: string, timeoutMs: number, proposalId?: string) => {
    for (const record of pendingDeliveries(accountId)) {
      if (proposalId && record.proposalId !== proposalId) continue;
      const notes = record.notes.map((encoded) => decodeNote(encoded, (bytes) => Note.deserialize(bytes)));
      await deliverCommittedNotes(midenClient, notes, record.recipientId, { fetchProof, timeoutMs });
      removePendingDelivery(record.proposalId);
    }
  };

  return {
    async ensureDelivered(multisig) {
      // Sends executed on this device, which may not be canonical on Guardian yet.
      await deliverRecorded(multisig.accountId, DELIVER_BEFORE_NEXT_MS);
      // The latest canonical transaction, as Guardian keeps it: covers a send
      // made on another device.
      const checks = noteChainChecks(MIDEN_RPC_URL);
      try {
        await ensureLatestPrivateNotesDelivered<LatestPrivateNote>({
          latestPrivateNotes: () => latestCanonicalPrivateNotes(multisig),
          committedAt: (n) => checks.committedAt(n.note),
          isConsumed: (n, block) => checks.isConsumed(n.note, block),
          deliver: async (n, to) => {
            const inclusionProof = await checks.fetchProof(n.note);
            if (!inclusionProof) throw new Error('its inclusion proof is not available yet');
            await midenClient.notes.sendPrivate({ note: n.note, to, inclusionProof });
          },
        });
      } finally {
        checks.free();
      }
    },

    record(multisig, proposal) {
      const recipientId = (proposal.metadata as { recipientId?: string }).recipientId;
      const notes = getOutputNotesFromTxSummary(proposal.txSummary);
      if (!recipientId || notes.length === 0) {
        throw new Error('This private payment has no note to deliver, so it was not sent.');
      }
      recordPendingDelivery({
        accountId: multisig.accountId,
        proposalId: proposal.id,
        recipientId,
        notes: notes.map(encodeNote),
        createdAt: Date.now(),
      });
    },

    deliver: (multisig, proposal) => deliverRecorded(multisig.accountId, DELIVER_AFTER_SEND_MS, proposal.id),

    hasPending: (accountId) => pendingDeliveries(accountId).length > 0,

    forget: (proposal) => removePendingDelivery(proposal.id),
  };
}

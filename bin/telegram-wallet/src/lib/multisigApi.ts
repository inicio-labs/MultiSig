import {
  MultisigClient,
  type Multisig,
  type MultisigConfig,
  type Signer,
} from '@openzeppelin/miden-multisig-client';
import type { GuardianHttpClient } from '@openzeppelin/guardian-client';
import {
  AccountId,
  Endpoint,
  NoteScript,
  NoteTag,
  NoteType,
  RpcClient,
  TransactionSummary,
  type MidenClient,
  type Note,
  type NoteInclusionProof,
} from '@miden-sdk/miden-sdk';
import { GUARDIAN_ENDPOINT, MIDEN_NETWORK, MIDEN_REGISTRATION_CODE, MIDEN_RPC_URL } from '@/config/psm';
import { normalizeCommitment } from '@/lib/helpers';
import { registerNodeAccount } from './nodeRegistration';
import { registrationInvitationCode } from './midenNetwork';
import { configureProverWorkflow } from './proverFallback';
import { markExecutionPushed } from './pendingCandidate';
import { retryProposalSubmission } from './proposalSubmission';

const registrationRequests = new Map<string, Promise<void>>();

/**
 * Registers a new account with the Miden node, on every network. The direct
 * RPC (nodeRegistration.ts) is used because the SDK's own path skips the call
 * when the node already allows the account. Registration funds a new account
 * (devnet and testnet). Concurrent calls for one account share one request.
 */
export function registerAccountOnNode(
  midenClient: MidenClient,
  accountId: string,
  userInvitationCode?: string,
): Promise<void> {
  const key = `${MIDEN_RPC_URL}:${accountId.toLowerCase()}`;
  const existing = registrationRequests.get(key);
  if (existing) return existing;

  let code: string;
  try {
    code = registrationInvitationCode(MIDEN_NETWORK, MIDEN_REGISTRATION_CODE, userInvitationCode);
  } catch (error) {
    return Promise.reject(error);
  }
  const request = (async () => {
    try {
      await registerNodeAccount(MIDEN_RPC_URL, accountId, code, () => undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const duplicate = /\bALREADY_REGISTERED\b|\balready registered\b/i.test(message);
      const allowed = /\bACCOUNT_ALREADY_ALLOWED\b|\balready allowed on the network\b/i.test(message);
      // Already registered is fine once the node confirms it accepts the
      // account; never swallow unrelated failures.
      if ((duplicate || allowed) && await midenClient.accounts.isAllowed(accountId)) return;
      throw error;
    }
  })();

  registrationRequests.set(key, request);
  request.finally(() => registrationRequests.delete(key)).catch(() => undefined);
  return request;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Extracts the full output notes a proposal's transaction will create, by
 * deserializing its own `txSummary` — no Guardian call, no chain sync, no
 * ambiguity between proposals. Same reconstruction `verifyProposalMetadataBinding`
 * already runs internally on every syncProposals().
 *
 * Returns full `Note` objects, not just IDs: sendPrivate() only skips its
 * local-database lookup when given an object with real `.id()`/`.assets()`
 * methods (checked via duck typing in the SDK's own sendPrivate wrapper). A
 * plain ID string or NoteId falls through to that lookup instead — which
 * fails here, because the note hasn't been executed yet, so it was never
 * written to the local database in the first place.
 */
export function getOutputNotesFromTxSummary(txSummaryBase64: string): Note[] {
  const summary = TransactionSummary.deserialize(base64ToBytes(txSummaryBase64));
  return summary
    .outputNotes()
    .notes()
    .map((note) => note.intoFull())
    .filter(
      (note): note is Note =>
        note !== undefined && note.metadata().noteType() === NoteType.Private,
    );
}

/**
 * The recipient account of a P2ID note, read from the note's storage (the
 * target account's suffix, then prefix); undefined for any other note script.
 */
export function p2idRecipient(note: Note): string | undefined {
  const recipient = note.recipient();
  if (recipient.script().root().toHex() !== NoteScript.p2id().root().toHex()) return undefined;
  const [suffix, prefix] = recipient.storage().items().map((felt) => felt.asInt().toString(16).padStart(16, '0'));
  if (!suffix || !prefix) return undefined;
  // The suffix felt carries the ID's last 7 bytes followed by a zero byte.
  return `0x${prefix}${suffix.slice(0, 14)}`;
}

/**
 * The Guardian client a Multisig signs its requests with. The class keeps it
 * private and exposes only `deltaHistory`; `MultisigClient.guardianClient` is
 * not a substitute: the app replaces it on a Guardian reconnect, and it has no
 * signer after an auto-load ("No signer configured").
 */
function multisigGuardian(multisig: Multisig): Pick<GuardianHttpClient, 'getDelta'> {
  return (multisig as unknown as { guardian: GuardianHttpClient }).guardian;
}

export interface LatestPrivateNote {
  id: string;
  recipientId: string | undefined;
  note: Note;
}

/**
 * The private notes of the account's latest canonical transaction, rebuilt
 * from the transaction summary Guardian keeps with the delta. Guardian
 * acknowledges every execution before it reaches the chain, so any signer can
 * read these notes from any device.
 */
export async function latestCanonicalPrivateNotes(
  multisig: Multisig,
  guardian: Pick<GuardianHttpClient, 'getDelta'> = multisigGuardian(multisig),
): Promise<LatestPrivateNote[]> {
  const { entries } = await multisig.deltaHistory({ limit: 1 });
  const latest = entries[0];
  if (!latest) return [];
  const delta = await guardian.getDelta(multisig.accountId, latest.nonce);
  const txSummary = (delta.deltaPayload as { txSummary?: { data?: unknown } } | undefined)?.txSummary?.data;
  if (typeof txSummary !== 'string') return [];
  return getOutputNotesFromTxSummary(txSummary).map((note) => ({
    id: note.id().toString(),
    recipientId: p2idRecipient(note),
    note,
  }));
}

/**
 * Node-side checks for private notes, over one RPC connection: where a note
 * was committed, whether it has been consumed, and its inclusion proof.
 * `free()` releases the connection.
 */
export function noteChainChecks(rpcUrl: string = MIDEN_RPC_URL) {
  const rpc = new RpcClient(new Endpoint(rpcUrl));
  const fetchProof = async (note: Note): Promise<NoteInclusionProof | undefined> => {
    const fetched = await rpc.getNotesById([note.id()]);
    try {
      return fetched[0]?.inclusionProof;
    } finally {
      for (const entry of fetched) entry.free();
    }
  };
  return {
    fetchProof,
    async committedAt(note: Note): Promise<number | undefined> {
      const proof = await fetchProof(note);
      if (!proof) return undefined;
      try {
        return proof.location().blockNum();
      } finally {
        proof.free();
      }
    },
    async isConsumed(note: Note, fromBlock: number): Promise<boolean> {
      return (await rpc.getNullifierCommitHeight(note.nullifier(), fromBlock)) !== undefined;
    },
    free: () => rpc.free(),
  };
}

/** Track notes addressed to the account, so syncs pick them up. */
export async function registerAccountNoteTag(midenClient: MidenClient, accountId: string): Promise<void> {
  await midenClient.tags.add(NoteTag.withAccountTarget(AccountId.fromHex(accountId)).asU32());
}

export interface MultisigHooks {
  /** The remote prover failed and this device is proving instead (slow on phones). */
  onProverFallback?(error: unknown): void;
}

/**
 * Wires each multisig for the app: sync before executing with a local-proving
 * fallback (proverFallback.ts), and re-submission of a built proposal when the
 * Guardian push fails transiently (proposalSubmission.ts).
 */
function prepareMultisig(multisig: Multisig, hooks: MultisigHooks): Multisig {
  retryProposalSubmission(multisig, {
    onRetry(attempt, error) {
      console.warn(`Guardian did not accept the proposal (attempt ${attempt}); retrying with the same data.`, error);
    },
  });
  configureProverWorkflow(multisig, {
    onPushed() {
      markExecutionPushed(multisig.accountId);
    },
    onFallback(error) {
      console.warn('Remote prover failed; proving on this device instead.', error);
      hooks.onProverFallback?.(error);
    },
  });
  return multisig;
}

export function createMultisigClient(midenClient: MidenClient): MultisigClient {
  return new MultisigClient(midenClient, { guardianEndpoint: GUARDIAN_ENDPOINT, midenRpcEndpoint: MIDEN_RPC_URL });
}

/**
 * A 1-of-1 Guardian account for this wallet's key: the key alone approves,
 * Guardian co-signs every transaction and keeps the (private) state, which is
 * what lets the same key find the account again from any device.
 */
export async function createWalletAccount(
  multisigClient: MultisigClient,
  signer: Signer,
  hooks: MultisigHooks = {},
): Promise<Multisig> {
  const guardian = await multisigClient.guardianClient.getPubkey('ecdsa');
  const config: MultisigConfig = {
    threshold: 1,
    signerCommitments: [normalizeCommitment(signer.commitment)],
    guardianCommitment: guardian.commitment,
    guardianPublicKey: guardian.pubkey,
    storageMode: 'private',
    signatureScheme: 'ecdsa',
  };
  return prepareMultisig(await multisigClient.create(config, signer), hooks);
}

export async function loadWalletAccount(
  multisigClient: MultisigClient,
  accountId: string,
  signer: Signer,
  hooks: MultisigHooks = {},
): Promise<Multisig> {
  return prepareMultisig(await multisigClient.load(accountId, signer), hooks);
}

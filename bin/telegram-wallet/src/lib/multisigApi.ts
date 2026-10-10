import {
  MultisigClient,
  type Multisig,
  type MultisigConfig,
  type Signer,
} from '@openzeppelin/miden-multisig-client';
import { AccountId, NoteTag, type MidenClient } from '@miden-sdk/miden-sdk';
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

import { AccountId, Address, NetworkId } from '@miden-sdk/miden-sdk';
import { GuardianHttpError, type GuardianHttpClient, type Signer } from '@openzeppelin/guardian-client';
import { BECH32_PREFIX, type MidenNetwork } from './midenNetwork';
import { formatError } from './errors';
import { toHexAccountId } from './helpers';

/** An account Guardian lists for a key: its ID and its Miden address on this network. */
export interface FoundAccount {
  accountId: string;
  address: string;
}

/**
 * The accounts on `guardian` whose signers include `signer`'s key, in the
 * order Guardian returns them. Guardian's lookup takes no session: the wallet
 * signs it every time, so it runs only when the user asks.
 */
export async function findAccountsByKey(
  guardian: GuardianHttpClient,
  signer: Signer,
  network: MidenNetwork,
): Promise<FoundAccount[]> {
  guardian.setSigner(signer);
  const { accounts } = await guardian.lookupAccountByKeyCommitment(signer.commitment);
  return accounts.map(({ accountId }) => ({ accountId, address: accountAddress(accountId, network) }));
}

/**
 * The Miden address of a hex account ID on `network` (mm1… on mainnet), without
 * routing parameters: the account itself. With them, every address would end in
 * the same `_…` suffix and the accounts would only differ in the middle.
 */
export function accountAddress(accountId: string, network: MidenNetwork): string {
  return Address.fromAccountId(AccountId.fromHex(accountId), null).toBech32(bech32NetworkId(network));
}

function bech32NetworkId(network: MidenNetwork): NetworkId {
  switch (network) {
    case 'mainnet': return NetworkId.mainnet();
    case 'testnet': return NetworkId.testnet();
    case 'devnet': return NetworkId.devnet();
    default: return NetworkId.custom(BECH32_PREFIX[network]);
  }
}

const NETWORK_OF_PREFIX = Object.fromEntries(
  Object.entries(BECH32_PREFIX).map(([network, prefix]) => [prefix, network]),
) as Record<string, MidenNetwork>;

/**
 * The account ID in what the user entered: a Miden address (mm1… on mainnet)
 * or a hex account ID, with or without 0x. Another network's address is
 * refused here rather than failing later as an unknown account.
 */
export function accountIdFromInput(input: string, network: MidenNetwork): string {
  const value = input.trim();
  if (!/^(0x)?[0-9a-f]+$/i.test(value)) {
    const prefix = /^([a-z]+)1/.exec(value)?.[1];
    const other = prefix && prefix !== BECH32_PREFIX[network] ? NETWORK_OF_PREFIX[prefix] : undefined;
    if (other) throw new Error(`This is a ${other} address. This app is on ${network}.`);
  }
  try {
    return toHexAccountId(value);
  } catch {
    throw new Error('Enter a Miden address (mm1…) or an account ID (0x…)');
  }
}

/** A failed lookup as one short line. */
export function lookupErrorMessage(error: unknown): string {
  if (error instanceof GuardianHttpError) {
    if (error.status === 401) {
      return /timestamp/i.test(error.userMessage ?? error.message)
        ? 'Your device clock is off. Fix it and try again.'
        : "Guardian couldn't verify the signature";
    }
    return error.userMessage ?? formatError(error);
  }
  const message = formatError(error);
  if (/cancel|reject|denied|declin/i.test(message)) return 'Signature declined';
  if (/failed to fetch|networkerror|load failed/i.test(message)) return 'Guardian is unreachable. Try again.';
  return message;
}

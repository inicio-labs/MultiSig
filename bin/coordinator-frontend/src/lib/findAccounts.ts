import { AccountId, Address, NetworkId } from '@miden-sdk/miden-sdk';
import { GuardianHttpError, type GuardianHttpClient, type Signer } from '@openzeppelin/guardian-client';
import { BECH32_PREFIX, type MidenNetwork } from './midenNetwork';
import { formatError, isWalletDecline } from './errors';
import { toHexAccountId } from './helpers';

/** An account Guardian lists for a key: its ID and its Miden address on this network. */
export interface FoundAccount {
  accountId: string;
  address: string;
}

/**
 * The accounts on `guardian` whose signers include `signer`'s key, in the
 * order Guardian returns them. The lookup sets the client's signer, so pass a
 * client of its own. Guardian's lookup takes no session: the wallet signs it
 * every time, so it runs only when the user asks.
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
  const id = AccountId.fromHex(accountId);
  const address = Address.fromAccountId(id, null);
  try {
    return address.toBech32(bech32NetworkId(network));
  } finally {
    address.free();
    id.free();
  }
}

/** The SDK network of `network`'s addresses. toBech32 takes it over, so make one per call. */
export function bech32NetworkId(network: MidenNetwork): NetworkId {
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
 * refused here rather than failing later as an unknown account, and hex that
 * is not an account ID (a key commitment, say) gets the same message as any
 * other input.
 */
export function accountIdFromInput(input: string, network: MidenNetwork): string {
  const value = input.trim();
  if (!/^(0x)?[0-9a-f]+$/i.test(value)) {
    // Bech32 may be written in upper case.
    const prefix = /^([a-z]+)1/.exec(value.toLowerCase())?.[1];
    const other = prefix && prefix !== BECH32_PREFIX[network] ? NETWORK_OF_PREFIX[prefix] : undefined;
    if (other) throw new Error(`This is a ${other} address. This app is on ${network}.`);
  }
  try {
    const accountId = toHexAccountId(value);
    AccountId.fromHex(accountId).free();
    return accountId;
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
  if (isWalletDecline(error)) return 'Signature declined';
  const message = formatError(error);
  if (/failed to fetch|networkerror|load failed/i.test(message)) return 'Guardian is unreachable. Try again.';
  return message;
}

/** What the Find your accounts control shows. */
export type AccountLookup =
  | { phase: 'idle' }
  /** The app is still starting: the wallet has not been asked yet. */
  | { phase: 'starting' }
  | { phase: 'asking' }
  | { phase: 'found'; accounts: FoundAccount[] }
  | { phase: 'none' }
  | { phase: 'failed'; message: string };

/** Looks up with `onAsk` called just before the wallet is asked to sign. */
export type FindAccounts = (onAsk: () => void) => Promise<FoundAccount[]>;

/**
 * Runs Find your accounts and reports its state. A lookup that a newer one or
 * a `reset` (another wallet connected) overtook reports nothing more, so a
 * late answer never shows one wallet's accounts under another.
 */
export function accountLookupRunner(report: (state: AccountLookup) => void) {
  let latest = 0;
  return {
    reset(): void {
      latest += 1;
      report({ phase: 'idle' });
    },
    async run(find: FindAccounts): Promise<void> {
      const run = ++latest;
      const update = (state: AccountLookup) => {
        if (run === latest) report(state);
      };
      update({ phase: 'starting' });
      try {
        const accounts = await find(() => update({ phase: 'asking' }));
        update(accounts.length ? { phase: 'found', accounts } : { phase: 'none' });
      } catch (error) {
        update({ phase: 'failed', message: lookupErrorMessage(error) });
      }
    },
  };
}

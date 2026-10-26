/**
 * The one Miden network this deployment talks to. Every network-specific
 * choice (RPC, the Miden Wallet's network, the Bech32 address prefix) derives
 * from it, so they cannot disagree.
 */
export type MidenNetwork = 'devnet' | 'testnet' | 'mainnet' | 'local' | 'custom';

const NETWORKS: readonly MidenNetwork[] = ['devnet', 'testnet', 'mainnet', 'local', 'custom'];

/** NEXT_PUBLIC_MIDEN_NETWORK: required, one of the names above. */
export function parseMidenNetwork(value: string | undefined): MidenNetwork {
  const named = value?.trim().toLowerCase();
  if (named && (NETWORKS as readonly string[]).includes(named)) return named as MidenNetwork;
  throw new Error(
    named
      ? `NEXT_PUBLIC_MIDEN_NETWORK must be one of ${NETWORKS.join(', ')}; got "${value}".`
      : `NEXT_PUBLIC_MIDEN_NETWORK is not set (one of ${NETWORKS.join(', ')}).`,
  );
}

/** Bech32 human-readable prefix per network, as in miden-protocol / miden-client. */
export const BECH32_PREFIX: Record<MidenNetwork, string> = {
  mainnet: 'mm',
  testnet: 'mtst',
  devnet: 'mdev',
  local: 'mlcl',
  custom: 'mcst',
};

/**
 * The network an address was written for, from its Bech32 prefix (mm1…,
 * mtst1…); null for a hex id or anything else. Money sent to another
 * network's address is lost: no one can create that account id here.
 */
export function addressNetwork(input: string): MidenNetwork | null {
  const match = /^([a-z]+)1[a-z0-9_]+$/.exec(input.trim().toLowerCase());
  if (!match) return null;
  const prefix = match[1];
  const network = (Object.keys(BECH32_PREFIX) as MidenNetwork[]).find((n) => BECH32_PREFIX[n] === prefix);
  return network ?? null;
}

/** Throws when `input` is an address of another network (hex ids pass: they carry no network). */
export function assertAddressOnNetwork(input: string, network: MidenNetwork): void {
  const found = addressNetwork(input);
  if (found && found !== network) {
    throw new Error(`That’s a ${found} address. This wallet is on ${network}, so money sent there would be lost.`);
  }
}

/**
 * Node-registration invitation code: the create page shows it pre-filled with
 * this default, and the creator can change it. Testnet accepts any code except
 * devnet's ("guardian" is refused by its funding service), so it gets a neutral
 * one; devnet uses the deployment's code; mainnet has none and requires the
 * creator's.
 */
export const TESTNET_INVITATION_CODE = '00000';

export function defaultInvitationCode(network: MidenNetwork, configured: string): string {
  if (network === 'testnet') return TESTNET_INVITATION_CODE;
  if (network === 'mainnet') return '';
  return configured;
}

/**
 * Invite-only: each new account registers with a code its user enters (the
 * private mainnet). NEXT_PUBLIC_INVITE_ONLY "1" or "0" decides; unset, only
 * mainnet is. Public mainnet sets "0" and the code screen goes away.
 */
export function inviteOnly(network: MidenNetwork, flag: string | undefined): boolean {
  if (flag === '1') return true;
  if (flag === '0') return false;
  return network === 'mainnet';
}

export function invitationCodeRequired(network: MidenNetwork, invite = network === 'mainnet'): boolean {
  return invite;
}

/** The code to send: the creator's if given, else the network default; an error if one is required and missing. */
export function registrationInvitationCode(
  network: MidenNetwork,
  configured: string,
  provided?: string,
  required = invitationCodeRequired(network),
): string {
  const code = provided?.trim() || defaultInvitationCode(network, configured);
  if (!code && required) {
    throw new Error('An invitation code is required to register an account on this network.');
  }
  return code;
}

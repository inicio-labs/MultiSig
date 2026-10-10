import { parseMidenNetwork, type MidenNetwork } from '@/lib/midenNetwork';

// Every network endpoint comes from env as a full URL: the code holds no
// devnet/testnet addresses. Missing or invalid values are collected in
// CONFIG_ERRORS and reported when the wallet starts.
const configErrors: string[] = [];

function endpoint(name: string, value: string | undefined, { allowLocal = false } = {}): string {
  const raw = value?.trim() ?? '';
  if (allowLocal && raw.toLowerCase() === 'local') return 'local';
  if (!raw) {
    configErrors.push(`${name} is not set.`);
    return '';
  }
  try {
    const url = new URL(raw);
    if (url.protocol === 'https:' || url.protocol === 'http:') return raw;
  } catch { /* reported below */ }
  configErrors.push(`${name} must be a full http(s) URL${allowLocal ? ' or "local"' : ''}; got "${raw}".`);
  return '';
}

export const GUARDIAN_ENDPOINT = endpoint('NEXT_PUBLIC_GUARDIAN_ENDPOINT', process.env.NEXT_PUBLIC_GUARDIAN_ENDPOINT);

// The network identity: the address prefix and the invitation-code rule follow it.
export const MIDEN_NETWORK: MidenNetwork = (() => {
  try {
    return parseMidenNetwork(process.env.NEXT_PUBLIC_MIDEN_NETWORK);
  } catch (error) {
    configErrors.push((error as Error).message);
    return 'custom';
  }
})();
export const MIDEN_RPC_URL = endpoint('NEXT_PUBLIC_MIDEN_RPC_URL', process.env.NEXT_PUBLIC_MIDEN_RPC_URL);
export const MIDEN_NOTE_TRANSPORT_URL = endpoint(
  'NEXT_PUBLIC_MIDEN_NOTE_TRANSPORT_URL',
  process.env.NEXT_PUBLIC_MIDEN_NOTE_TRANSPORT_URL,
);
// A remote prover URL, or "local" for in-browser proving (the default when
// unset). A remote prover sees the full transaction witness, so using one is a
// deliberate deployment choice; phones prove slowly enough that this wallet's
// deployment is expected to set one, with local proving as the fallback.
export const MIDEN_PROVER_URL = process.env.NEXT_PUBLIC_MIDEN_PROVER_URL?.trim()
  ? endpoint('NEXT_PUBLIC_MIDEN_PROVER_URL', process.env.NEXT_PUBLIC_MIDEN_PROVER_URL, { allowLocal: true })
  : 'local';

export const MIDEN_REGISTRATION_CODE = process.env.NEXT_PUBLIC_MIDEN_REGISTRATION_CODE || '';
export const MIDEN_DB_NAME = 'MidenTelegramWalletDB';

export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim() ?? '';
if (!PRIVY_APP_ID) configErrors.push('NEXT_PUBLIC_PRIVY_APP_ID is not set.');
// Optional: Privy app client ID, for apps with more than one client configured.
export const PRIVY_CLIENT_ID = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID?.trim() || undefined;

/** Configuration problems; the wallet refuses to start while any remain. */
export const CONFIG_ERRORS: readonly string[] = configErrors;

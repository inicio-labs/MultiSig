/** Which keys on the phone mainnet's fresh start removes (freshStart.ts); pure, for tests. */
export const STORAGE_PREFIX = 'miden-tg-wallet:';

const KEEP = ['pubkey:', 'pref:hide_amounts', 'pref:sound', 'dev-private-key', 'fresh-start:'].map((k) => STORAGE_PREFIX + k);

export function staleKeys(keys: string[]): string[] {
  return keys.filter((key) => key.startsWith(STORAGE_PREFIX) && !KEEP.some((keep) => key.startsWith(keep)));
}

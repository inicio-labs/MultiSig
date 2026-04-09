export function normalizeCommitment(hex: string): string {
  const trimmed = hex.trim();
  if (!trimmed) throw new Error('Commitment is required');
  const withoutPrefix =
    trimmed.startsWith('0x') || trimmed.startsWith('0X') ? trimmed.slice(2) : trimmed;
  if (!/^[0-9a-fA-F]{64}$/.test(withoutPrefix)) {
    throw new Error('Commitment must be a 64-character hex string');
  }
  return `0x${withoutPrefix.toLowerCase()}`;
}

export function copyToClipboard(text: string, onSuccess?: () => void): void {
  navigator.clipboard.writeText(text).then(() => {
    onSuccess?.();
  });
}

export async function clearIndexedDB(): Promise<void> {
  const databases = await indexedDB.databases();
  const deletePromises = databases
    .filter((db) => db.name)
    .map(
      (db) =>
        new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase(db.name!);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
          request.onblocked = () => resolve();
        })
    );
  await Promise.all(deletePromises);
}

/**
 * Normalize an account ID from either bech32 (mtst1...) or hex (0x...) to hex format.
 * Requires AccountId and Address from @miden-sdk/miden-sdk to be passed in for bech32 support.
 */
export function normalizeAccountId(
  input: string,
  sdk?: { AccountId: { fromBech32(s: string): { toString(): string; free(): void } }; Address: { fromBech32(s: string): { accountId(): { toString(): string; free(): void }; free(): void } } },
): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('Account ID is required');

  // Hex format — only if it starts with 0x or is purely hex chars
  if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
    return trimmed;
  }
  if (/^[0-9a-fA-F]+$/.test(trimmed)) {
    return `0x${trimmed}`;
  }

  if (!sdk) {
    throw new Error(`Invalid account ID: "${trimmed}". Use hex (0x...) or bech32 (mtst1...) format.`);
  }

  // Bech32 format — try AccountId first, then Address
  try {
    const accountId = sdk.AccountId.fromBech32(trimmed);
    const hex = accountId.toString();
    accountId.free();
    return hex;
  } catch { /* not an AccountId bech32, try Address */ }

  try {
    const address = sdk.Address.fromBech32(trimmed);
    const accountId = address.accountId();
    const hex = accountId.toString();
    accountId.free();
    address.free();
    return hex;
  } catch {
    throw new Error(`Invalid account ID: "${trimmed}". Use hex (0x...) or bech32 (mtst1...) format.`);
  }
}

export function truncateHex(hex: string, start = 16, end = 8): string {
  if (hex.length <= start + end) return hex;
  return `${hex.slice(0, start)}...${hex.slice(-end)}`;
}

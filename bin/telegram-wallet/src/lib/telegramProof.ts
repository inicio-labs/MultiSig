import { ed25519 } from '@noble/curves/ed25519';
import { addressNetwork, type MidenNetwork } from './midenNetwork';

/**
 * A directory entry's proof, checked on the payer's own phone: launch data
 * that Telegram signed (Ed25519, "third-party validation": its public key and
 * the bot id, no bot token), opened from the start parameter reg_<address>.
 * So "@alex is this address" rests on Telegram's signature, not on our server
 * (which can only withhold an entry or serve an older one).
 * https://core.telegram.org/bots/webapps#validating-data-for-third-party-use
 */
export const TELEGRAM_PUBLIC_KEY = 'e7bf03a2fa4602af4580703d88dda5bb59f32ed8b02a56c187fe7d34caed242d';

export interface DirectoryEntry {
  userId: string;
  /** Lowercase, without @; null when the user has none. */
  username: string | null;
  name: string;
  /** The address they registered, as written in the link: a Bech32 address (mm1…, mtst1…), or a hex id from before networks were part of it. */
  address: string;
  /** The network that address is for, from its prefix; null for a hex id (registered on testnet, before). */
  network: MidenNetwork | null;
  /** When they registered (ms). */
  registeredAt: number;
}

function hexToBytes(hex: string): Uint8Array {
  return Uint8Array.from(hex.match(/../g) ?? [], (byte) => parseInt(byte, 16));
}

function base64UrlToBytes(text: string): Uint8Array {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/** Who registered which address, if Telegram's signature holds; null otherwise. */
export function readDirectoryProof(initData: string, botId: string, publicKeyHex = TELEGRAM_PUBLIC_KEY): DirectoryEntry | null {
  try {
    const params = new URLSearchParams(initData);
    const signature = params.get('signature');
    if (!signature || !botId) return null;
    const check = `${botId}:WebAppData\n` + [...params.entries()]
      .filter(([key]) => key !== 'hash' && key !== 'signature')
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    if (!ed25519.verify(base64UrlToBytes(signature), new TextEncoder().encode(check), hexToBytes(publicKeyHex))) return null;
    const match = /^reg_(0x[0-9a-f]{20,64}|[a-z]+1[a-z0-9_]{6,90})$/.exec(params.get('start_param') ?? '');
    const user = JSON.parse(params.get('user') ?? 'null') as { id?: number; username?: string; first_name?: string; last_name?: string } | null;
    const registeredAt = Number(params.get('auth_date')) * 1000;
    if (!match || !user?.id || !Number.isFinite(registeredAt)) return null;
    return {
      userId: String(user.id),
      username: user.username ? user.username.toLowerCase() : null,
      name: [user.first_name, user.last_name].filter(Boolean).join(' ') || (user.username ? `@${user.username}` : 'Telegram user'),
      address: match[1],
      network: addressNetwork(match[1]),
      registeredAt,
    };
  } catch {
    return null;
  }
}

/**
 * A proof's entry for `network`, with the address as the app uses it (hex,
 * via `toHex`). Null for another network's entry; a hex-id entry (registered
 * before networks were in the link) counts as testnet, the only network then.
 */
export function entryForNetwork(
  entry: DirectoryEntry | null,
  network: MidenNetwork,
  toHex: (address: string) => string,
): DirectoryEntry | null {
  if (!entry || (entry.network ?? 'testnet') !== network) return null;
  try {
    return { ...entry, address: toHex(entry.address) };
  } catch {
    return null;
  }
}

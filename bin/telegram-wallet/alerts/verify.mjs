// Telegram's proof that a request comes from a user who opened this bot's
// mini app: the launch data (initData), signed with a key derived from the
// bot token. https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
import { createHmac, createPublicKey, timingSafeEqual, verify } from 'node:crypto';

// Launch data stays valid this long: the wallet may stay open for a while.
const MAX_AGE_SEC = 24 * 60 * 60;

/** The Telegram user id, when `initData` is genuine and recent; null otherwise. */
export function verifyInitData(initData, botToken, nowSec = Math.floor(Date.now() / 1000)) {
  if (typeof initData !== 'string' || !initData || !botToken) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) return null;
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const checkString = (left) => [...params.entries()]
    .filter(([key]) => !left.includes(key))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  // Clients that also send an Ed25519 `signature` sign it into the hash; older ones do not have it.
  const genuine = [['hash'], ['hash', 'signature']].some((left) => timingSafeEqual(
    createHmac('sha256', secret).update(checkString(left)).digest(),
    Buffer.from(hash, 'hex'),
  ));
  if (!genuine) return null;
  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate) || nowSec - authDate > MAX_AGE_SEC) return null;
  try {
    const user = JSON.parse(params.get('user') ?? 'null');
    return user?.id ? String(user.id) : null;
  } catch {
    return null;
  }
}

// Telegram's Ed25519 key for "third-party" checks of launch data (production).
export const TELEGRAM_PUBLIC_KEY = 'e7bf03a2fa4602af4580703d88dda5bb59f32ed8b02a56c187fe7d34caed242d';
const ACCOUNT_ID = /^0x[0-9a-f]{20,64}$/;

/**
 * A directory proof: launch data whose Ed25519 `signature` (checkable by
 * anyone with Telegram's public key and the bot id, no bot token) covers a
 * start parameter "reg_<address>". Returns who registered which address, or
 * null. The wallet checks the same on the payer's phone (telegramProof.ts).
 */
export function readDirectoryProof(initData, botId, publicKeyHex = TELEGRAM_PUBLIC_KEY) {
  if (typeof initData !== 'string' || !initData || !botId) return null;
  const params = new URLSearchParams(initData);
  const signature = params.get('signature');
  if (!signature) return null;
  const check = `${botId}:WebAppData\n` + [...params.entries()]
    .filter(([key]) => key !== 'hash' && key !== 'signature')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const key = createPublicKey({
    key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(publicKeyHex, 'hex')]),
    format: 'der',
    type: 'spki',
  });
  let genuine = false;
  try {
    genuine = verify(null, Buffer.from(check), key, Buffer.from(signature, 'base64url'));
  } catch {
    return null;
  }
  if (!genuine) return null;
  const match = /^reg_(0x[0-9a-f]{20,64})$/.exec(params.get('start_param') ?? '');
  if (!match || !ACCOUNT_ID.test(match[1])) return null;
  try {
    const user = JSON.parse(params.get('user') ?? 'null');
    if (!user?.id) return null;
    return { userId: String(user.id), username: user.username ? String(user.username).toLowerCase() : null, address: match[1] };
  } catch {
    return null;
  }
}

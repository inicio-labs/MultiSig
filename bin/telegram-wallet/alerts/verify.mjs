// Telegram's proof that a request comes from a user who opened this bot's
// mini app: the launch data (initData), signed with a key derived from the
// bot token. https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
import { createHmac, timingSafeEqual } from 'node:crypto';

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

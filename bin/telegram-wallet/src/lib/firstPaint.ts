/**
 * The home screen as plain text, saved on this phone by the live screen and
 * painted by InstantPreview the moment the page opens: before the wallet's
 * code (Privy, the Miden SDK: several MB) has even loaded. Keep this file
 * free of heavy imports and of module-level `window` (the page prerenders).
 */
export interface FirstPaint {
  balance: string;
  symbol: string;
  name: string | null;
  /** As on the card (short). */
  address: string;
  /** Newest first; `ts` (ms) for the day headers and times, worked out at paint time. */
  rows: Array<{ in: boolean; sub: string; value: string; ts: number }>;
  savedAt: number;
}

const KEY = 'miden-tg-wallet:first-paint:';
// prefs.ts keeps this device's copy of "hide amounts" here.
const HIDE_AMOUNTS_KEY = 'miden-tg-wallet:pref:hide_amounts';

// The Telegram user in the launch URL, as telegram.ts reads it (which cannot
// be imported here: it reads `window` when it loads).
function launchUser(): string | null {
  try {
    const url = new URL(window.location.href);
    const data = new URLSearchParams(url.hash.slice(1)).get('tgWebAppData') ?? url.searchParams.get('tgWebAppData');
    const user = data ? JSON.parse(new URLSearchParams(data).get('user') ?? 'null') as { id?: number } | null : null;
    return user?.id ? String(user.id) : null;
  } catch {
    return null;
  }
}

/** This Telegram user's saved home screen, if this phone has one. */
export function readFirstPaint(): { paint: FirstPaint; hidden: boolean } | null {
  const user = launchUser();
  if (!user) return null;
  try {
    const paint = JSON.parse(window.localStorage.getItem(`${KEY}tg:${user}`) ?? 'null') as FirstPaint | null;
    if (!paint || typeof paint.balance !== 'string' || !Array.isArray(paint.rows)) return null;
    // Saved before rows had times: not worth a jumpy first paint.
    if (paint.rows.some((row) => typeof row.ts !== 'number')) return null;
    return { paint, hidden: window.localStorage.getItem(HIDE_AMOUNTS_KEY) === '1' };
  } catch {
    return null;
  }
}

/** `viewKey` as savedView.ts makes it ("tg:<user>"). */
export function saveFirstPaint(viewKey: string, paint: FirstPaint): void {
  try {
    window.localStorage.setItem(KEY + viewKey, JSON.stringify(paint));
  } catch { /* only the instant first paint is lost */ }
}

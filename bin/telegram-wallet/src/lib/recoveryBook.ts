import { storage } from './storage';
import { telegramCloud } from './telegram';
import { VIEW_SCOPE } from './viewScope';

/**
 * What the user's other phones need to know about recovery, kept in their
 * Telegram (CloudStorage, per user, on every device): the recovery email (a
 * new phone sends the code there without asking) and a name per phone key
 * ("iPhone · added 21 Oct"), so a new phone can say which one stops sending.
 * Labels only: what the account allows is always read from the account.
 */
export interface RecoveryBook {
  email?: { address: string; commitment: string };
  phones: Record<string, { platform: string; addedAt: number }>;
}

const KEY = `${VIEW_SCOPE.replace(/:$/, '_')}recovery_book`;
const LOCAL = `miden-tg-wallet:${KEY}`;

function parse(raw: string | null): RecoveryBook {
  try {
    const book = raw ? JSON.parse(raw) as RecoveryBook : null;
    return book && typeof book.phones === 'object' && book.phones ? book : { phones: {} };
  } catch {
    return { phones: {} };
  }
}

export async function readRecoveryBook(): Promise<RecoveryBook> {
  const cloud = telegramCloud();
  const raw = (cloud ? await cloud.get(KEY) : null) ?? storage.get(LOCAL);
  return parse(raw);
}

export async function updateRecoveryBook(change: (book: RecoveryBook) => RecoveryBook): Promise<void> {
  const next = JSON.stringify(change(await readRecoveryBook()));
  storage.set(LOCAL, next);
  await telegramCloud()?.set(KEY, next);
}

const PLATFORMS: Record<string, string> = { ios: 'iPhone', android: 'Android phone', android_x: 'Android phone' };

export function platformName(platform: string | undefined): string {
  return PLATFORMS[platform ?? ''] ?? 'phone';
}

const day = (at: number) => new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** "iPhone · added 21 Oct", or "phone" when unknown. */
export function phoneLabel(book: RecoveryBook, commitment: string): string {
  const phone = book.phones[commitment.toLowerCase()];
  return phone ? `${platformName(phone.platform)} · added ${day(phone.addedAt)}` : 'phone';
}

/** When and which phone was added most recently among `commitments` (for "This phone was removed"). */
export function newestPhone(book: RecoveryBook, commitments: string[]): { platform: string; addedAt: number } | null {
  return commitments
    .map((c) => book.phones[c.toLowerCase()])
    .filter((p): p is { platform: string; addedAt: number } => Boolean(p))
    .sort((a, b) => b.addedAt - a.addedAt)[0] ?? null;
}

import { storage } from './storage';
import { VIEW_SCOPE } from './viewScope';

/**
 * Pay-by-@username is on by default, like a UPI ID: a wallet joins the
 * directory by itself unless its owner turned it off. Joining reopens the
 * wallet once (Telegram signs the launch), so it is tried at most once a day.
 */
const TRIED = `miden-tg-wallet:${VIEW_SCOPE}directory-auto-at`;
const PENDING = `miden-tg-wallet:${VIEW_SCOPE}directory-auto-pending`;
const NOTICE = `miden-tg-wallet:${VIEW_SCOPE}directory-auto-notice`;
const RETRY_MS = 24 * 60 * 60 * 1000;

export interface AutoJoinState {
  /** In the directory already. */
  on: boolean | null;
  /** Turned off by its owner: never joined again automatically. */
  off: boolean | null;
  /** Both settings read from Telegram's cloud. */
  loaded: boolean;
  hasUsername: boolean;
  available: boolean;
  /** Opened from a link (pay, collect, registration): that comes first. */
  openedFromLink: boolean;
  /** Home on screen, nothing running. */
  idle: boolean;
  lastTriedAt: number | null;
  now: number;
}

export function autoJoinDue(s: AutoJoinState): boolean {
  if (!s.loaded || s.on !== false || s.off === true) return false;
  if (!s.hasUsername || !s.available || s.openedFromLink || !s.idle) return false;
  return s.lastTriedAt === null || s.now - s.lastTriedAt >= RETRY_MS;
}

export function lastAutoJoinAt(): number | null {
  const at = Number(storage.get(TRIED));
  return at > 0 ? at : null;
}

/** Before reopening for Telegram's signature: remembered, so the reopened wallet knows it joined by itself. */
export function markAutoJoin(now: number): void {
  storage.set(TRIED, String(now));
  storage.set(PENDING, '1');
}

/** On the reopened wallet: was this an automatic join (read once)? */
export function takeAutoJoin(): boolean {
  const pending = storage.get(PENDING) === '1';
  storage.remove(PENDING);
  return pending;
}

/** "Friends can now pay you as @…", shown on home until dismissed. */
export const autoJoinNotice = {
  shown: (): boolean => storage.get(NOTICE) === '1',
  show: (): void => storage.set(NOTICE, '1'),
  dismiss: (): void => storage.remove(NOTICE),
};

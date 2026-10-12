import type { Signer } from '@openzeppelin/miden-multisig-client';
import { storage } from './storage';
import { insideTelegram, telegramUserId } from './telegram';
import { LAST_VIEW_KEY } from './walletEngine';

/**
 * Whose saved home view to show on opening (walletEngine.ts saves it): the
 * Telegram user's, known from the first frame, so the last balance shows
 * while Telegram, Privy and the wallet are still starting. Outside Telegram,
 * the signing key's, once it is ready.
 */
export function viewKeyFor(signer: Signer | null): string | null {
  const telegramUser = insideTelegram ? telegramUserId() : null;
  if (telegramUser) return `tg:${telegramUser}`;
  return signer ? `key:${signer.commitment.toLowerCase()}` : null;
}

export function hasSavedView(key: string | null): boolean {
  return key !== null && storage.get(LAST_VIEW_KEY + key) !== null;
}

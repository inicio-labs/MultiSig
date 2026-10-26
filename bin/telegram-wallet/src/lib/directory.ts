import { MIDEN_NETWORK } from '@/config/psm';
import { accountAddress } from './address';
import { toHexAccountId } from './helpers';
import { postToServer } from './privpayServer';
import { entryForNetwork, readDirectoryProof, type DirectoryEntry } from './telegramProof';
import { openTelegramLink, telegramStartParam, telegramUserId } from './telegram';

/**
 * "Pay @username": who opted in, as proofs signed by Telegram (telegramProof.ts)
 * kept on the PrivPay server. Registering reopens the wallet from
 * t.me/<bot>?startapp=reg_<address>, so Telegram signs launch data naming
 * that address; payers check the signature on their own phone. The address
 * is the Bech32 one (mm1…, mtst1…), so the network is inside what Telegram
 * signed: an entry from another network is never paid (its account id does
 * not exist here, and money sent to it would be lost).
 */
const BOT_ID = (process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID ?? '').trim();
const APP_URL = (process.env.NEXT_PUBLIC_TELEGRAM_APP_URL ?? '').trim();
const REG = 'reg_';

export const directoryAvailable = (): boolean => Boolean(BOT_ID && APP_URL) && telegramUserId() !== null;

/** Step 1: reopen the wallet from the registration link (Telegram signs it). */
export function startRegistration(accountId: string): void {
  const base = APP_URL.replace(/[?#].*$/, '');
  openTelegramLink(`${base}?startapp=${REG}${accountAddress(accountId)}`);
}

/** Opened from this wallet's own registration link (step 1 done); the hex form is the older link. */
export const isRegistrationLaunch = (accountId: string): boolean => {
  const param = telegramStartParam();
  return param === `${REG}${accountAddress(accountId)}` || param === `${REG}${accountId.toLowerCase()}`;
};

/** A proof's entry for this wallet's network, address in hex (telegramProof.ts). */
export const entryForThisNetwork = (entry: DirectoryEntry | null): DirectoryEntry | null =>
  entryForNetwork(entry, MIDEN_NETWORK, toHexAccountId);

/** Step 2: hand the signed launch data to the server. */
export async function completeRegistration(): Promise<boolean> {
  return (await postToServer('/directory/register', {})) !== null;
}

export async function unregister(): Promise<boolean> {
  return (await postToServer('/directory/unregister', {})) !== null;
}

/** The entry for @username, checked against Telegram's signature here; null when there is none (or it does not hold). */
export async function lookupUsername(username: string): Promise<DirectoryEntry | null> {
  const wanted = username.replace(/^@/, '').toLowerCase();
  const answer = await postToServer('/directory/lookup', { username: wanted });
  const entry = entryForThisNetwork(typeof answer?.proof === 'string' ? readDirectoryProof(answer.proof, BOT_ID) : null);
  // An old name pointing at someone who has changed theirs since: not them.
  return entry && entry.username === wanted ? entry : null;
}

/** This user's own entry, to notice it is missing or names another address. */
export async function lookupSelf(): Promise<DirectoryEntry | null> {
  const userId = telegramUserId();
  if (!userId) return null;
  const answer = await postToServer('/directory/lookup', { userId });
  const entry = entryForThisNetwork(typeof answer?.proof === 'string' ? readDirectoryProof(answer.proof, BOT_ID) : null);
  return entry && entry.userId === userId ? entry : null;
}

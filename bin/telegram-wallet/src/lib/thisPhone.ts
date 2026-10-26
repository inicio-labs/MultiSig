import type { Signer } from '@openzeppelin/miden-multisig-client';
import type { BiometricManager } from './biometrics';
import { devBiometrics, DEV_FAKE_BIOMETRICS } from './devBiometrics';
import {
  createPhoneKey,
  createPhoneSigner,
  forgetPhoneKeyRecord,
  loadPhoneKeyRecord,
  PhoneKey,
  savePhoneKeyRecord,
  type PhoneKeyRecord,
} from './phoneKey';
import { storage } from './storage';
import { telegramBiometrics, telegramPlatform, telegramUserId } from './telegram';

/**
 * This phone's key for the Telegram user who opened the app (phoneKey.ts):
 * its public record on the phone, the key behind the scan, and its signer,
 * each made once. The engine reads it for payments once recovery is on.
 */

// Whose key: per Telegram user (the development signer has one user).
function user(): string | null {
  return telegramUserId() ?? (DEV_FAKE_BIOMETRICS ? 'dev' : null);
}

// Development: the stand-in, even on a page posing as Telegram (whose own manager never answers there).
export function phoneBiometrics(): BiometricManager | null {
  return DEV_FAKE_BIOMETRICS ? devBiometrics() : telegramBiometrics();
}

let cached: { publicKey: string; key: PhoneKey; signer: Promise<Signer> } | null = null;

function entry(record: Pick<PhoneKeyRecord, 'publicKey'>, manager = phoneBiometrics()) {
  if (cached?.publicKey === record.publicKey.toLowerCase()) return cached;
  if (!manager) throw new Error('Face ID is not available here.');
  const key = new PhoneKey(manager, record.publicKey, undefined, () => thisPhone.forget());
  const signer = createPhoneSigner(key);
  signer.catch(() => { if (cached?.key === key) cached = null; });
  cached = { publicKey: record.publicKey.toLowerCase(), key, signer };
  return cached;
}

export const thisPhone = {
  record(): PhoneKeyRecord | null {
    const who = user();
    return who ? loadPhoneKeyRecord(storage, who) : null;
  },

  /** The key's commitment, once made (no scan). */
  commitment(): string | null {
    return thisPhone.record()?.commitment || null;
  },

  /** The key behind the scan (null: this phone has none). */
  key(): PhoneKey | null {
    const record = thisPhone.record();
    return record ? entry(record).key : null;
  },

  signer(): Promise<Signer> {
    const record = thisPhone.record();
    if (!record) return Promise.reject(new Error('This phone has no key yet.'));
    return entry(record).signer;
  },

  /**
   * Makes this phone's key (one Telegram permission prompt the first time,
   * no scan) and keeps its public record. An existing one is kept: setup
   * interrupted after this step finds it again. Needs the Miden SDK loaded.
   */
  async create(): Promise<PhoneKeyRecord> {
    const who = user();
    if (!who) throw new Error('Open PrivPay in Telegram on your phone.');
    const existing = loadPhoneKeyRecord(storage, who);
    if (existing?.commitment) return existing;
    const { record } = await createPhoneKey(phoneBiometrics());
    const signer = await entry(record).signer;
    const saved: PhoneKeyRecord = { ...record, commitment: signer.commitment, platform: telegramPlatform() || 'web' };
    savePhoneKeyRecord(storage, who, saved);
    return saved;
  },

  /** Telegram no longer has the key, or the account no longer lists it. */
  forget(): void {
    const who = user();
    if (who) forgetPhoneKeyRecord(storage, who);
    cached = null;
  },
};

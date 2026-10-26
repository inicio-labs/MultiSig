import { afterEach, describe, expect, it, vi } from 'vitest';
import * as M from '@miden-sdk/miden-sdk';
import { EcdsaSigner } from '@openzeppelin/miden-multisig-client';
import { hexToBytes, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { BiometricManager } from '@/lib/biometrics';
import {
  createPhoneKey,
  createPhoneSigner,
  loadPhoneKeyRecord,
  PhoneKey,
  PhoneKeyGone,
  PhoneKeyLocked,
  PhoneKeyNotConfirmed,
  PhoneKeyUnavailable,
  savePhoneKeyRecord,
} from '@/lib/phoneKey';

const KEY: Hex = '0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318';
const OTHER: Hex = '0x8da4ef21b864d2cc526dbdb2a120bd2874c36c9d0a1fb7f8c63d7f7a8b41de8f';
const PUBLIC = privateKeyToAccount(KEY).publicKey;
const COMMITMENT = '0x' + '1f'.repeat(32);

/** Telegram's BiometricManager with a stored token; `answers` decides each scan. */
function fakeManager({ token = KEY as string | null, answers = [] as boolean[], grant = true, save = true } = {}) {
  const scans: string[] = [];
  const manager: BiometricManager = {
    isInited: true,
    isBiometricAvailable: true,
    biometricType: 'face',
    isAccessRequested: true,
    isAccessGranted: true,
    isBiometricTokenSaved: token !== null,
    deviceId: 'device-1',
    init(callback) { callback?.(); },
    requestAccess(_params, callback) {
      manager.isAccessRequested = true;
      manager.isAccessGranted = grant;
      callback?.(grant);
    },
    authenticate(params, callback) {
      scans.push(params.reason ?? '');
      const ok = answers.length ? answers.shift()! : true;
      callback?.(ok, ok ? token ?? '' : undefined);
    },
    openSettings() {},
    updateBiometricToken(value, callback) {
      token = value;
      manager.isBiometricTokenSaved = value !== '';
      callback?.(save);
    },
  };
  return { manager, scans, stored: () => token };
}

function midenSigner(privateKey: Hex) {
  const bytes = new Uint8Array(33);
  bytes[0] = 1;
  bytes.set(hexToBytes(privateKey), 1);
  return new EcdsaSigner(M.AuthSecretKey.deserialize(bytes));
}

afterEach(() => { vi.useRealTimers(); });

describe('createPhoneKey', () => {
  it('stores a fresh key behind the scan and hands it back once', async () => {
    const { manager, stored } = fakeManager({ token: null });
    const { privateKey, record } = await createPhoneKey(manager);
    expect(stored()).toBe(privateKey);
    expect(record.publicKey).toBe(privateKeyToAccount(privateKey).publicKey);
    expect(record).toMatchObject({ deviceId: 'device-1', active: false });
  });

  it('asks Telegram’s permission first if it never asked', async () => {
    const { manager } = fakeManager({ token: null });
    manager.isAccessRequested = false;
    manager.isAccessGranted = false;
    await createPhoneKey(manager);
    expect(manager.isAccessGranted).toBe(true);
  });

  it('refuses without Telegram, without permission, or when Telegram does not save it', async () => {
    await expect(createPhoneKey(null)).rejects.toMatchObject({ lock: 'no-telegram' });
    const declined = fakeManager({ token: null, grant: false });
    declined.manager.isAccessRequested = false;
    await expect(createPhoneKey(declined.manager)).rejects.toMatchObject({ lock: 'denied' });
    await expect(createPhoneKey(fakeManager({ token: null, save: false }).manager)).rejects.toBeInstanceOf(PhoneKeyUnavailable);
  });
});

describe('PhoneKey', () => {
  it('scans fresh for every user action and holds the key until it ends', async () => {
    const { manager, scans } = fakeManager();
    const phone = new PhoneKey(manager, PUBLIC);
    const inside = await phone.withKey('Send 1 USDCX', async () => {
      // Signatures inside the action (sign, then execute after proving): no new scan.
      await phone.key();
      return phone.key();
    });
    expect(inside).toBe(KEY);
    await phone.withKey('Send 2 USDCX', async () => undefined);
    expect(scans).toEqual(['Send 1 USDCX', 'Send 2 USDCX']);
    // Dropped after the action: the next background signature scans.
    await phone.key();
    expect(scans).toHaveLength(3);
  });

  it('throws when the scan is cancelled, and runs nothing', async () => {
    const { manager } = fakeManager({ answers: [false] });
    const action = vi.fn();
    await expect(new PhoneKey(manager, PUBLIC).withKey('Send', action)).rejects.toBeInstanceOf(PhoneKeyNotConfirmed);
    expect(action).not.toHaveBeenCalled();
  });

  it('a background scan keeps the key a minute, then drops it', async () => {
    vi.useFakeTimers();
    const { manager, scans } = fakeManager();
    const phone = new PhoneKey(manager, PUBLIC, 60_000);
    await phone.key();
    await vi.advanceTimersByTimeAsync(59_000);
    await phone.key();
    await vi.advanceTimersByTimeAsync(59_000);
    await phone.key();
    expect(scans).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(61_000);
    await phone.key();
    expect(scans).toHaveLength(2);
  });

  it('concurrent signatures share one scan', async () => {
    const { manager, scans } = fakeManager();
    const phone = new PhoneKey(manager, PUBLIC);
    await Promise.all([phone.key(), phone.key(), phone.key()]);
    expect(scans).toHaveLength(1);
  });

  it('after a declined background scan, refreshes stop prompting until the user asks again', async () => {
    const { manager, scans } = fakeManager({ answers: [false] });
    const phone = new PhoneKey(manager, PUBLIC);
    await expect(phone.key()).rejects.toBeInstanceOf(PhoneKeyNotConfirmed);
    await expect(phone.key()).rejects.toBeInstanceOf(PhoneKeyLocked);
    expect(scans).toHaveLength(1);
    phone.allowScan();
    await expect(phone.key()).resolves.toBe(KEY);
  });

  it('a user action works again after a declined background scan', async () => {
    const { manager } = fakeManager({ answers: [false, true] });
    const phone = new PhoneKey(manager, PUBLIC);
    await expect(phone.key()).rejects.toBeInstanceOf(PhoneKeyNotConfirmed);
    await expect(phone.withKey('Send', async () => phone.key())).resolves.toBe(KEY);
  });

  it('reports the key gone when Telegram returns another key or none', async () => {
    await expect(new PhoneKey(fakeManager({ token: OTHER }).manager, PUBLIC).key()).rejects.toBeInstanceOf(PhoneKeyGone);
    await expect(new PhoneKey(fakeManager({ token: '' }).manager, PUBLIC).key()).rejects.toBeInstanceOf(PhoneKeyGone);
  });

  it('holds a just-created key without a scan, and refuses a different one', async () => {
    vi.useFakeTimers();
    const { manager, scans } = fakeManager();
    const phone = new PhoneKey(manager, PUBLIC, 60_000);
    await expect(phone.holding(KEY, () => phone.key())).resolves.toBe(KEY);
    // Kept a minute after, for the first loads with it.
    await phone.key();
    expect(scans).toHaveLength(0);
    await expect(phone.holding(OTHER, async () => undefined)).rejects.toThrow('not this phone’s key');
  });
});

describe('createPhoneSigner', () => {
  it('signs as the Miden SDK does for the same key, scanning once per action', async () => {
    const { manager, scans } = fakeManager();
    const phone = new PhoneKey(manager, PUBLIC);
    const signer = await createPhoneSigner(phone);
    const reference = midenSigner(KEY);
    expect(signer.commitment).toBe(reference.commitment);
    const signature = await phone.withKey('Send', async () => {
      await signer.signCommitment(COMMITMENT);
      return signer.signCommitment(COMMITMENT);
    });
    expect(signature.replace(/^0x/, '')).toBe((await reference.signCommitment(COMMITMENT)).replace(/^0x/, ''));
    expect(scans).toEqual(['Send']);
  });
});

describe('phone key record', () => {
  it('keeps public data per Telegram user and ignores anything malformed', () => {
    const map = new Map<string, string>();
    const store = { get: (k: string) => map.get(k) ?? null, set: (k: string, v: string) => void map.set(k, v), remove: (k: string) => void map.delete(k) };
    const record = { publicKey: PUBLIC, commitment: COMMITMENT, deviceId: 'd', createdAt: 1, active: true };
    savePhoneKeyRecord(store, '42', record);
    expect(loadPhoneKeyRecord(store, '42')).toEqual(record);
    expect(loadPhoneKeyRecord(store, '43')).toBeNull();
    map.set('miden-tg-wallet:phone-key:44', '{"publicKey":"0x12"}');
    expect(loadPhoneKeyRecord(store, '44')).toBeNull();
    expect(JSON.stringify([...map.values()])).not.toContain(KEY.slice(2));
  });
});

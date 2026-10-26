import type { Signer } from '@openzeppelin/miden-multisig-client';
import { isHex, type Hex } from 'viem';
import { generatePrivateKey, privateKeyToAccount, publicKeyToAddress, sign } from 'viem/accounts';
import {
  requestBiometricAccess,
  sendLock,
  type BiometricManager,
  type SendLock,
} from './biometrics';
import { createPrivySigner } from './privySigner';

/**
 * This phone's signing key, kept by Telegram behind Face ID or a fingerprint
 * (BiometricManager's token, Bot API 7.2). Recovery adds it to the account
 * next to the Telegram key (Privy) and the recovery email key, two of the
 * three needed to pay: payments are this key (one scan) plus the Telegram
 * key, which signs silently (recovery.ts).
 *
 * Telegram hands the key back only after a scan. The app holds it in memory
 * for one user action (a send, a collect) and drops it after; a scan for a
 * background signature (a Guardian session running out while the app is
 * open) keeps it a minute. Only public data stays on the phone.
 */

/** Public data about this phone's key, per Telegram user, kept on the phone. */
export interface PhoneKeyRecord {
  /** Uncompressed secp256k1 public key. */
  publicKey: Hex;
  /** Its Miden commitment: the cosigner the account lists. */
  commitment: string;
  /** Telegram's id for the biometric storage that holds the key. */
  deviceId: string;
  createdAt: number;
  /** Guardian lists it as a cosigner: the wallet signs with it from now on. */
  active: boolean;
  /** Telegram's platform name (ios, android…), to name the phone ("iPhone · added 21 Oct"). */
  platform?: string;
}

const RECORD_KEY = 'miden-tg-wallet:phone-key:';

type Store = { get(key: string): string | null; set(key: string, value: string): void; remove(key: string): void };

export function loadPhoneKeyRecord(store: Store, userId: string): PhoneKeyRecord | null {
  try {
    const raw = store.get(RECORD_KEY + userId);
    if (!raw) return null;
    const record = JSON.parse(raw) as PhoneKeyRecord;
    return isUncompressedKey(record.publicKey) && typeof record.commitment === 'string' ? record : null;
  } catch {
    return null;
  }
}

export function savePhoneKeyRecord(store: Store, userId: string, record: PhoneKeyRecord): void {
  store.set(RECORD_KEY + userId, JSON.stringify(record));
}

export function forgetPhoneKeyRecord(store: Store, userId: string): void {
  store.remove(RECORD_KEY + userId);
}

/** The scan was cancelled or did not match. */
export class PhoneKeyNotConfirmed extends Error {
  constructor() {
    super('Not confirmed.');
    this.name = 'PhoneKeyNotConfirmed';
  }
}

/**
 * Telegram no longer has this phone's key (Telegram reinstalled, a new face
 * or finger enrolled, another Telegram account): the phone must be added
 * again, with the Telegram key and the recovery email.
 */
export class PhoneKeyGone extends Error {
  constructor() {
    super('This phone’s key is gone. Add this phone to your wallet again.');
    this.name = 'PhoneKeyGone';
  }
}

/** A background signature after the user declined a scan: waits for them to ask again. */
export class PhoneKeyLocked extends Error {
  constructor() {
    super('Confirm with Face ID to continue.');
    this.name = 'PhoneKeyLocked';
  }
}

/** Why the phone cannot hold a key ("ok" when it can). */
export class PhoneKeyUnavailable extends Error {
  constructor(readonly lock: Exclude<SendLock, 'ok'> | 'not-saved') {
    super(lock === 'not-saved' ? 'Telegram could not save the key on this phone.' : `Face ID is not available (${lock}).`);
    this.name = 'PhoneKeyUnavailable';
  }
}

/** Shown in Telegram's scan for a background signature. */
export const OPEN_REASON = 'Open your wallet';
// A key unlocked for a background signature stays this long after its last use.
const BACKGROUND_HOLD_MS = 60_000;

/**
 * Makes this phone's key and stores it behind the scan. Asks Telegram's
 * permission first if it was never asked. Returns the key itself once, so
 * the caller can use it (add it to the account) without a second scan.
 */
export async function createPhoneKey(manager: BiometricManager | null): Promise<{ privateKey: Hex; record: PhoneKeyRecord }> {
  const lock = await sendLock(manager);
  if (lock !== 'ok' || !manager) throw new PhoneKeyUnavailable(lock === 'ok' ? 'no-telegram' : lock);
  if (!manager.isAccessRequested && !(await requestBiometricAccess(manager))) throw new PhoneKeyUnavailable('denied');
  if (!manager.isAccessGranted) throw new PhoneKeyUnavailable('denied');
  if (!manager.updateBiometricToken) throw new PhoneKeyUnavailable('no-telegram');
  const privateKey = generatePrivateKey();
  const saved = await new Promise<boolean>((resolve) => { manager.updateBiometricToken!(privateKey, resolve); });
  if (!saved) throw new PhoneKeyUnavailable('not-saved');
  const publicKey = privateKeyToAccount(privateKey).publicKey;
  return {
    privateKey,
    record: { publicKey, commitment: '', deviceId: manager.deviceId ?? '', createdAt: Date.now(), active: false },
  };
}

/** The key Telegram keeps for this phone, with the scan in front of it. */
export class PhoneKey {
  private held: Hex | null = null;
  private holds = 0;
  private dropTimer: ReturnType<typeof setTimeout> | null = null;
  private unlocking: Promise<Hex> | null = null;
  // One Telegram prompt at a time.
  private scans: Promise<unknown> = Promise.resolve();
  private declined = false;

  constructor(
    private readonly manager: BiometricManager,
    readonly publicKey: Hex,
    private readonly backgroundHoldMs = BACKGROUND_HOLD_MS,
    /** Telegram no longer has this key (see PhoneKeyGone). */
    private readonly onGone?: () => void,
  ) {}

  /**
   * A user action (send, collect): always a fresh scan, then the key stays
   * in memory until the action ends, however long proving takes.
   */
  async withKey<T>(reason: string, action: () => Promise<T>): Promise<T> {
    const key = await this.scan(reason);
    this.declined = false;
    this.take(key);
    try {
      return await action();
    } finally {
      this.release();
    }
  }

  /**
   * Hold a key the app already has (just created, before it is on the
   * account) through an action, without a scan.
   */
  async holding<T>(privateKey: Hex, action: () => Promise<T>): Promise<T> {
    if (privateKeyToAccount(privateKey).publicKey.toLowerCase() !== this.publicKey.toLowerCase()) {
      throw new Error('That is not this phone’s key.');
    }
    this.take(privateKey);
    try {
      return await action();
    } finally {
      this.release(this.backgroundHoldMs);
    }
  }

  /**
   * For a signature: the key in hand, else one scan, unless the user just
   * declined one (a refresh must not keep prompting): then PhoneKeyLocked
   * until `allowScan`.
   */
  key(reason = OPEN_REASON): Promise<Hex> {
    if (this.held) {
      if (this.holds === 0) this.dropLater(this.backgroundHoldMs);
      return Promise.resolve(this.held);
    }
    if (this.declined) return Promise.reject(new PhoneKeyLocked());
    this.unlocking ??= this.scan(reason)
      .then((key) => {
        this.held = key;
        if (this.holds === 0) this.dropLater(this.backgroundHoldMs);
        return key;
      }, (error: unknown) => {
        if (error instanceof PhoneKeyNotConfirmed) this.declined = true;
        throw error;
      })
      .finally(() => { this.unlocking = null; });
    return this.unlocking;
  }

  /** The user asked to try again: the next signature may scan. */
  allowScan(): void {
    this.declined = false;
  }

  /** Forget the key now. */
  lock(): void {
    this.held = null;
    this.holds = 0;
    this.clearDrop();
  }

  private take(key: Hex): void {
    this.clearDrop();
    this.held = key;
    this.holds++;
  }

  private release(keepMs = 0): void {
    this.holds = Math.max(0, this.holds - 1);
    if (this.holds > 0) return;
    if (keepMs > 0) this.dropLater(keepMs);
    else this.lock();
  }

  private dropLater(ms: number): void {
    this.clearDrop();
    this.dropTimer = setTimeout(() => { if (this.holds === 0) this.held = null; }, ms);
  }

  private clearDrop(): void {
    if (this.dropTimer) clearTimeout(this.dropTimer);
    this.dropTimer = null;
  }

  private scan(reason: string): Promise<Hex> {
    const run = this.scans.then(async () => {
      const token = await new Promise<string | undefined>((resolve) => {
        this.manager.authenticate({ reason: reason.slice(0, 128) }, (ok, token) => resolve(ok ? token ?? '' : undefined));
      });
      if (token === undefined) throw new PhoneKeyNotConfirmed();
      if (!isPrivateKey(token) || privateKeyToAccount(token).publicKey.toLowerCase() !== this.publicKey.toLowerCase()) {
        this.onGone?.();
        throw new PhoneKeyGone();
      }
      return token;
    });
    this.scans = run.catch(() => undefined);
    return run;
  }
}

/**
 * The multisig signer for this phone's key. Building it needs no scan (the
 * public key is known); each signature asks the PhoneKey for the key. Same
 * adapter as the Privy key, so both sign the same way. Needs the Miden SDK's
 * WASM (await `getWasmOrThrow()` first).
 */
export async function createPhoneSigner(phoneKey: PhoneKey): Promise<Signer> {
  const { signer } = await createPrivySigner({
    address: publicKeyToAddress(phoneKey.publicKey),
    publicKey: phoneKey.publicKey,
    provider: {
      async request({ method, params }) {
        if (method !== 'secp256k1_sign') throw new Error(`Unsupported method ${method}`);
        return sign({ hash: (params as [Hex])[0], privateKey: await phoneKey.key(), to: 'hex' });
      },
    },
  });
  return signer;
}

/** Read the key back from Telegram with one scan, when the phone forgot its record (cleared storage). */
export async function readPhoneKey(manager: BiometricManager, reason = OPEN_REASON): Promise<Hex> {
  const ok = await new Promise<string | undefined>((resolve) => {
    manager.authenticate({ reason }, (passed, token) => resolve(passed ? token ?? '' : undefined));
  });
  if (ok === undefined) throw new PhoneKeyNotConfirmed();
  if (!isPrivateKey(ok)) throw new PhoneKeyGone();
  return ok;
}

function isPrivateKey(value: string): value is Hex {
  return isHex(value) && value.length === 66 && !/^0x0+$/.test(value);
}

function isUncompressedKey(value: unknown): value is Hex {
  return typeof value === 'string' && /^0x04[0-9a-fA-F]{128}$/.test(value);
}

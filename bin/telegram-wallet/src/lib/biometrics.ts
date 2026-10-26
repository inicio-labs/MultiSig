/**
 * Face ID or fingerprint before every send, through Telegram's own prompt
 * (BiometricManager, Bot API 7.2). Strict: no scan, no send. Where there is
 * nothing to scan with (Telegram Desktop and web, a phone without Face ID or
 * fingerprint, a Telegram that does not answer) or the permission was
 * declined, the wallet can view and receive but not send. It locks the
 * phone, not the key: the Privy key could still sign on its own.
 */

/** Telegram's BiometricManager, the parts the wallet uses. */
export interface BiometricManager {
  isInited: boolean;
  isBiometricAvailable: boolean;
  biometricType: 'finger' | 'face' | 'unknown';
  isAccessRequested: boolean;
  isAccessGranted: boolean;
  /** A token (here: this phone's signing key, see phoneKey.ts) is stored behind the scan. */
  isBiometricTokenSaved?: boolean;
  /** Telegram's id for this device's biometric storage. */
  deviceId?: string;
  init(callback?: () => void): unknown;
  requestAccess(params: { reason?: string }, callback?: (granted: boolean) => void): unknown;
  authenticate(params: { reason?: string }, callback?: (authenticated: boolean, token?: string) => void): unknown;
  openSettings(): unknown;
  /** Stores a token that `authenticate` hands back after a scan (empty removes it). */
  updateBiometricToken?(token: string, callback?: (updated: boolean) => void): unknown;
}

// Telegram shows at most 128 characters of a reason.
const REASON_MAX = 128;
/** Shown in Telegram's permission popup, the first time the wallet asks. */
export const ACCESS_REASON = 'Confirm your payments with a glance or a touch';

// A Telegram app that never answers whether it has biometrics must not hold
// a send forever: past this, it counts as having none.
const INIT_TIMEOUT_MS = 2_000;

export function initBiometrics(manager: BiometricManager, timeoutMs = INIT_TIMEOUT_MS): Promise<void> {
  if (manager.isInited) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    manager.init(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/** What this phone calls it, e.g. "Face ID" on an iPhone. */
export function biometricName(type: BiometricManager['biometricType'], platform: string): string {
  const apple = platform === 'ios' || platform === 'macos';
  if (type === 'face') return apple ? 'Face ID' : 'Face unlock';
  if (type === 'finger') return apple ? 'Touch ID' : 'Fingerprint';
  return 'Biometrics';
}

/** Telegram's permission popup; resolves whether it was granted. */
export function requestBiometricAccess(manager: BiometricManager): Promise<boolean> {
  return new Promise((resolve) => { manager.requestAccess({ reason: ACCESS_REASON }, resolve); });
}

/** The scan itself; resolves whether it was the phone's owner. */
export function authenticate(manager: BiometricManager, reason: string): Promise<boolean> {
  return new Promise((resolve) => {
    manager.authenticate({ reason: reason.slice(0, REASON_MAX) }, (authenticated) => resolve(authenticated));
  });
}

/** Why this device cannot send right now ("ok" when it can ask for a scan). */
export type SendLock = 'ok' | 'no-telegram' | 'no-biometrics' | 'no-answer' | 'denied';

/** Whether this device can confirm a send with a scan, without asking anything yet. */
export async function sendLock(manager: BiometricManager | null): Promise<SendLock> {
  if (!manager) return 'no-telegram';
  await initBiometrics(manager);
  if (!manager.isInited) return 'no-answer';
  if (!manager.isBiometricAvailable) return 'no-biometrics';
  if (manager.isAccessRequested && !manager.isAccessGranted) return 'denied';
  return 'ok';
}

/**
 * The scan before a send: "ok" only after a successful one. The first send
 * asks Telegram's permission; declining it is "denied".
 */
export async function confirmWithBiometrics(manager: BiometricManager | null, reason: string): Promise<SendLock | 'failed'> {
  const lock = await sendLock(manager);
  if (lock !== 'ok' || !manager) return lock;
  if (!manager.isAccessRequested && !(await requestBiometricAccess(manager))) return 'denied';
  return (await authenticate(manager, reason)) ? 'ok' : 'failed';
}

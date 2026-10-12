/**
 * Face ID or fingerprint before a send, through Telegram's own prompt
 * (BiometricManager, Bot API 7.2). It locks the phone, not the key: the
 * Privy key still signs on its own, so this stops someone holding an
 * unlocked phone, not someone with the Telegram account on another device.
 * Where there is nothing to ask with (Telegram Desktop and web, phones
 * without biometrics) or the user declined Telegram's permission, sends go
 * ahead without it.
 */

/** Telegram's BiometricManager, the parts the wallet uses. */
export interface BiometricManager {
  isInited: boolean;
  isBiometricAvailable: boolean;
  biometricType: 'finger' | 'face' | 'unknown';
  isAccessRequested: boolean;
  isAccessGranted: boolean;
  init(callback?: () => void): unknown;
  requestAccess(params: { reason?: string }, callback?: (granted: boolean) => void): unknown;
  authenticate(params: { reason?: string }, callback?: (authenticated: boolean, token?: string) => void): unknown;
  openSettings(): unknown;
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

/**
 * Whether a send may go ahead: after a successful scan, or when this phone
 * cannot ask. The first send asks Telegram's permission.
 */
export async function confirmWithBiometrics(
  manager: BiometricManager | null,
  { enabled, reason }: { enabled: boolean; reason: string },
): Promise<boolean> {
  if (!manager || !enabled) return true;
  await initBiometrics(manager);
  if (!manager.isInited || !manager.isBiometricAvailable) return true;
  if (!manager.isAccessRequested && !(await requestBiometricAccess(manager))) return true;
  if (!manager.isAccessGranted) return true;
  return authenticate(manager, reason);
}

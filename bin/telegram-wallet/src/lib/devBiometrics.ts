import type { BiometricManager } from './biometrics';
import { DEV_LOCAL_SIGNER } from './devSigner';
import { storage } from './storage';

/**
 * Development only, with the browser-held key (devSigner.ts): Telegram's
 * BiometricManager stood in, its token in localStorage, so the phone-key
 * flows run on a laptop. Every scan passes (logged), unless localStorage has
 * `miden-tg-wallet:dev-biometric-deny` set. Production builds never use it.
 */
export const DEV_FAKE_BIOMETRICS = DEV_LOCAL_SIGNER;

const TOKEN_KEY = 'miden-tg-wallet:dev-biometric-token';
const DENY_KEY = 'miden-tg-wallet:dev-biometric-deny';

export function devBiometrics(): BiometricManager | null {
  if (!DEV_FAKE_BIOMETRICS || typeof window === 'undefined') return null;
  const manager: BiometricManager = {
    isInited: true,
    isBiometricAvailable: true,
    biometricType: 'face',
    isAccessRequested: true,
    isAccessGranted: true,
    get isBiometricTokenSaved() { return Boolean(storage.get(TOKEN_KEY)); },
    deviceId: 'dev-browser',
    init(callback) { callback?.(); },
    requestAccess(_params, callback) { callback?.(true); },
    authenticate(params, callback) {
      const ok = !storage.get(DENY_KEY);
      console.info(`[dev Face ID] ${params.reason ?? ''}: ${ok ? 'passed' : 'declined'}`);
      callback?.(ok, ok ? storage.get(TOKEN_KEY) ?? '' : undefined);
    },
    openSettings() {},
    updateBiometricToken(token, callback) {
      if (token) storage.set(TOKEN_KEY, token);
      else storage.remove(TOKEN_KEY);
      callback?.(true);
    },
  };
  return manager;
}

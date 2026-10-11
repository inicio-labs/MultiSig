import { describe, expect, it } from 'vitest';
import { biometricName, confirmWithBiometrics, type BiometricManager } from '@/lib/biometrics';

function fakeManager(over: Partial<BiometricManager> = {}, { grant = true, pass = true } = {}) {
  const calls: string[] = [];
  const manager: BiometricManager = {
    isInited: false,
    isBiometricAvailable: true,
    biometricType: 'face',
    isAccessRequested: false,
    isAccessGranted: false,
    init(callback) { calls.push('init'); manager.isInited = true; callback?.(); },
    requestAccess(params, callback) {
      calls.push(`access:${params.reason}`);
      manager.isAccessRequested = true;
      manager.isAccessGranted = grant;
      callback?.(grant);
    },
    authenticate(params, callback) { calls.push(`auth:${params.reason}`); callback?.(pass, pass ? 'token' : undefined); },
    openSettings() { calls.push('settings'); },
    ...over,
  };
  return { manager, calls };
}

describe('Face ID before a send', () => {
  it('goes ahead without asking where Telegram has no biometrics', async () => {
    expect(await confirmWithBiometrics(null, { enabled: true, reason: 'Send 1 USDCX' })).toBe(true);
  });

  it('goes ahead without asking when turned off', async () => {
    const { manager, calls } = fakeManager({ isInited: true, isAccessRequested: true, isAccessGranted: true });
    expect(await confirmWithBiometrics(manager, { enabled: false, reason: 'Send 1 USDCX' })).toBe(true);
    expect(calls).toEqual([]);
  });

  it('goes ahead on a phone without Face ID or fingerprint', async () => {
    const { manager, calls } = fakeManager({ isBiometricAvailable: false });
    expect(await confirmWithBiometrics(manager, { enabled: true, reason: 'Send 1 USDCX' })).toBe(true);
    expect(calls).toEqual(['init']);
  });

  it('asks Telegram’s permission on the first send, then scans', async () => {
    const { manager, calls } = fakeManager();
    expect(await confirmWithBiometrics(manager, { enabled: true, reason: 'Send 1 USDCX' })).toBe(true);
    expect(calls).toEqual(['init', 'access:Confirm your payments with a glance or a touch', 'auth:Send 1 USDCX']);
  });

  it('goes ahead without a scan when the permission is declined, now or before', async () => {
    const declined = fakeManager({}, { grant: false });
    expect(await confirmWithBiometrics(declined.manager, { enabled: true, reason: 'Send 1 USDCX' })).toBe(true);
    expect(declined.calls.some((c) => c.startsWith('auth'))).toBe(false);

    const before = fakeManager({ isInited: true, isAccessRequested: true, isAccessGranted: false });
    expect(await confirmWithBiometrics(before.manager, { enabled: true, reason: 'Send 1 USDCX' })).toBe(true);
    expect(before.calls).toEqual([]);
  });

  it('stops the send when the scan fails', async () => {
    const { manager, calls } = fakeManager({ isInited: true, isAccessRequested: true, isAccessGranted: true }, { pass: false });
    expect(await confirmWithBiometrics(manager, { enabled: true, reason: 'Send 1 USDCX' })).toBe(false);
    expect(calls).toEqual(['auth:Send 1 USDCX']);
  });

  it('keeps the reason within Telegram’s 128 characters', async () => {
    const { manager, calls } = fakeManager({ isInited: true, isAccessRequested: true, isAccessGranted: true });
    await confirmWithBiometrics(manager, { enabled: true, reason: 'x'.repeat(200) });
    expect(calls[0]).toBe(`auth:${'x'.repeat(128)}`);
  });

  it('names it the way the phone does', () => {
    expect(biometricName('face', 'ios')).toBe('Face ID');
    expect(biometricName('finger', 'ios')).toBe('Touch ID');
    expect(biometricName('finger', 'android')).toBe('Fingerprint');
    expect(biometricName('face', 'android')).toBe('Face unlock');
    expect(biometricName('unknown', 'android')).toBe('Biometrics');
  });
});

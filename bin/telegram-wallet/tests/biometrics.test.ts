import { describe, expect, it, vi } from 'vitest';
import { biometricName, confirmWithBiometrics, sendLock, type BiometricManager } from '@/lib/biometrics';

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

describe('Face ID before every send (strict)', () => {
  const granted = { isInited: true, isAccessRequested: true, isAccessGranted: true };

  it('cannot send without Telegram’s biometrics (Desktop, web)', async () => {
    expect(await confirmWithBiometrics(null, 'Send 1 USDCX')).toBe('no-telegram');
    expect(await sendLock(null)).toBe('no-telegram');
  });

  it('cannot send on a phone without Face ID or fingerprint', async () => {
    const { manager, calls } = fakeManager({ isBiometricAvailable: false });
    expect(await confirmWithBiometrics(manager, 'Send 1 USDCX')).toBe('no-biometrics');
    expect(calls).toEqual(['init']);
  });

  it('cannot send when Telegram never answers', async () => {
    vi.useFakeTimers();
    try {
      const { manager } = fakeManager({ init() {} });
      const result = confirmWithBiometrics(manager, 'Send 1 USDCX');
      await vi.advanceTimersByTimeAsync(2_000);
      await expect(result).resolves.toBe('no-answer');
    } finally {
      vi.useRealTimers();
    }
  });

  it('asks Telegram’s permission on the first send, then scans', async () => {
    const { manager, calls } = fakeManager();
    expect(await confirmWithBiometrics(manager, 'Send 1 USDCX')).toBe('ok');
    expect(calls).toEqual(['init', 'access:Confirm your payments with a glance or a touch', 'auth:Send 1 USDCX']);
  });

  it('cannot send when the permission is declined, now or before', async () => {
    const declined = fakeManager({}, { grant: false });
    expect(await confirmWithBiometrics(declined.manager, 'Send 1 USDCX')).toBe('denied');
    expect(declined.calls.some((c) => c.startsWith('auth'))).toBe(false);

    const before = fakeManager({ isInited: true, isAccessRequested: true, isAccessGranted: false });
    expect(await sendLock(before.manager)).toBe('denied');
  });

  it('a failed scan is not a send', async () => {
    const { manager } = fakeManager(granted, { pass: false });
    expect(await confirmWithBiometrics(manager, 'Send 1 USDCX')).toBe('failed');
  });

  it('keeps the reason within Telegram’s 128 characters', async () => {
    const { manager, calls } = fakeManager(granted);
    await confirmWithBiometrics(manager, 'x'.repeat(200));
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

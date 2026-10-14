import { describe, expect, it } from 'vitest';
import {
  browserKind,
  OPEN_LINK_VARIANTS,
  passkeyCheckRequested,
  passkeyCheckUrl,
  privyPasskeyTestRequested,
  refuseEnrollReason,
  resultsText,
} from '@/lib/testPages';

const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const WKWEBVIEW = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const CHROME_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0 Mobile/15E148 Safari/604.1';

describe('test page gates', () => {
  it('opens the passkey check from the start param, the query or the Settings flag only', () => {
    expect(passkeyCheckRequested({ startParam: 'passkey_check', search: '', flag: false })).toBe(true);
    expect(passkeyCheckRequested({ startParam: null, search: '?passkey_check=1', flag: false })).toBe(true);
    expect(passkeyCheckRequested({ startParam: null, search: '', flag: true })).toBe(true);
    expect(passkeyCheckRequested({ startParam: null, search: '', flag: false })).toBe(false);
    expect(passkeyCheckRequested({ startParam: 'pay_x', search: '?passkey_check=0', flag: false })).toBe(false);
  });

  it('opens the Privy test only with ?privy_passkey_test=1', () => {
    expect(privyPasskeyTestRequested('?privy_passkey_test=1')).toBe(true);
    expect(privyPasskeyTestRequested('?a=b&privy_passkey_test=1')).toBe(true);
    expect(privyPasskeyTestRequested('')).toBe(false);
    expect(privyPasskeyTestRequested('?privy_passkey_test=true')).toBe(false);
  });
});

describe('browserKind', () => {
  it('names the Telegram webview from its launch data or bridge', () => {
    expect(browserKind({ userAgent: SAFARI, initData: 'query_id=1', telegramBridge: true })).toMatch(/mini app webview/);
    expect(browserKind({ userAgent: WKWEBVIEW, initData: '', telegramBridge: true })).toMatch(/bridge present/);
  });

  it('tells Safari-like browsers from plain in-app webviews on iOS', () => {
    expect(browserKind({ userAgent: SAFARI, initData: '', telegramBridge: false })).toMatch(/Safari/);
    expect(browserKind({ userAgent: WKWEBVIEW, initData: '', telegramBridge: false })).toMatch(/In-app webview/);
    expect(browserKind({ userAgent: CHROME_IOS, initData: '', telegramBridge: false })).toBe('Chrome on iOS');
  });
});

describe('refuseEnrollReason', () => {
  it('allows only an email test account', () => {
    expect(refuseEnrollReason({ email: 'test@example.com', linkedTypes: ['email'] })).toBeNull();
    expect(refuseEnrollReason({ email: 'test@example.com', linkedTypes: ['email', 'wallet', 'passkey'] })).toBeNull();
  });

  it('refuses a Telegram-linked account, even with an email', () => {
    expect(refuseEnrollReason({ email: 'me@example.com', linkedTypes: ['email', 'telegram', 'wallet'] })).toMatch(/Telegram/);
    expect(refuseEnrollReason({ email: null, linkedTypes: ['telegram', 'wallet'] })).toMatch(/Telegram/);
  });

  it('refuses no account, no email, or other logins', () => {
    expect(refuseEnrollReason(null)).toMatch(/Not signed in/);
    expect(refuseEnrollReason({ email: null, linkedTypes: ['wallet'] })).toMatch(/no email/);
    expect(refuseEnrollReason({ email: 'a@b.c', linkedTypes: ['email', 'google_oauth'] })).toMatch(/google_oauth/);
  });
});

describe('openLink variants', () => {
  it('uses only the documented options at their Bot API versions', () => {
    expect(OPEN_LINK_VARIANTS.map((v) => [v.options ?? null, v.minVersion])).toEqual([
      [null, '6.1'],
      [{ try_instant_view: true }, '6.4'],
      [{ try_browser: 'chrome' }, '7.6'],
    ]);
    expect(passkeyCheckUrl('https://privpay.forkchoice.xyz')).toBe('https://privpay.forkchoice.xyz/?passkey_check=1');
  });

  it('formats results one per line', () => {
    expect(resultsText([{ step: 'A', result: 'ok' }, { step: 'B', result: 'no' }])).toBe('A: ok\nB: no');
  });
});

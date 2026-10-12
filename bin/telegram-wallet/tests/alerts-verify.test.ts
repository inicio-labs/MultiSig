import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyInitData } from '../alerts/verify.mjs';

const TOKEN = '123456:test-token';
const NOW = 1_800_000_000;

function initData(fields: Record<string, string>, token = TOKEN, signIncludesSignature = false): string {
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  const check = Object.entries(fields)
    .filter(([k]) => signIncludesSignature || k !== 'signature')
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`).join('\n');
  const hash = createHmac('sha256', secret).update(check).digest('hex');
  return new URLSearchParams({ ...fields, hash }).toString();
}

const user = JSON.stringify({ id: 4242, first_name: 'Test' });

describe('verifyInitData (payment alerts server)', () => {
  it('accepts genuine, recent launch data and returns the user id', () => {
    expect(verifyInitData(initData({ user, auth_date: String(NOW - 60), query_id: 'q' }), TOKEN, NOW)).toBe('4242');
    // With an Ed25519 signature field, signed into the hash or not.
    expect(verifyInitData(initData({ user, auth_date: String(NOW), signature: 'sig' }, TOKEN, true), TOKEN, NOW)).toBe('4242');
    expect(verifyInitData(initData({ user, auth_date: String(NOW), signature: 'sig' }), TOKEN, NOW)).toBe('4242');
  });

  it('rejects data signed for another bot, tampered, stale or empty', () => {
    expect(verifyInitData(initData({ user, auth_date: String(NOW) }, '999:other'), TOKEN, NOW)).toBeNull();
    const tampered = initData({ user, auth_date: String(NOW) }).replace('4242', '4243');
    expect(verifyInitData(tampered, TOKEN, NOW)).toBeNull();
    expect(verifyInitData(initData({ user, auth_date: String(NOW - 2 * 86_400) }), TOKEN, NOW)).toBeNull();
    expect(verifyInitData('', TOKEN, NOW)).toBeNull();
  });
});

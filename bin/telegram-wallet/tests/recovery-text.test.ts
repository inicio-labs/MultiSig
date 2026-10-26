import { describe, expect, it } from 'vitest';
import { recoveryText } from '../alerts/recoveryText.mjs';

describe('recovery news texts', () => {
  it('a new phone: when, which phone, which email, and what to do if it was not them', () => {
    const text = recoveryText('phone-added', { email: 'v•••@gmail.com', platform: 'ios', when: 'Today at 14:32' })!;
    expect(text).toContain('<b>A new phone was added to your PrivPay wallet</b>');
    expect(text).toContain('Today at 14:32 · iPhone · approved with your recovery email v•••@gmail.com.');
    expect(text).toContain('Telegram › Settings › Devices');
  });

  it('recovery set up', () => {
    expect(recoveryText('set-up', { email: 'v•••@gmail.com', platform: 'android', when: 'Today at 9:05' }))
      .toContain('Today at 9:05 · Android phone · recovery email v•••@gmail.com.');
  });

  it('escapes what the wallet sends, and refuses unknown events', () => {
    expect(recoveryText('phone-added', { email: '<b>x</b>@y.z' })).toContain('&lt;b&gt;x&lt;/b&gt;@y.z');
    expect(recoveryText('anything-else')).toBeNull();
  });
});

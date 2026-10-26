import { describe, expect, it } from 'vitest';
import { usernameIn } from '../src/lib/username';

describe('usernames in To', () => {
  it('takes a username with or without the @', () => {
    expect(usernameIn('@vaibhav_jindal')).toBe('@vaibhav_jindal');
    expect(usernameIn('vaibhav_jindal')).toBe('@vaibhav_jindal');
    expect(usernameIn('alex')).toBe('@alex');
  });

  it('never takes an address being typed, or what Telegram would not allow', () => {
    expect(usernameIn('mm1aqwerty')).toBeNull();
    expect(usernameIn('mtst1arwhl')).toBeNull();
    expect(usernameIn('0x84a2357eee012c8161fa8692f3e55c')).toBeNull();
    expect(usernameIn('mm1aqw8n2y9xzf0q7c6r5t4e3w2q1lkjhgfdsazxcvbnm')).toBeNull();
    expect(usernameIn('ab')).toBeNull();
    expect(usernameIn('1alex')).toBeNull();
    expect(usernameIn('hello world')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { parseMidenNetwork } from '../src/lib/midenNetwork';

describe('parseMidenNetwork', () => {
  it('takes the network name from env only, never from an endpoint', () => {
    expect(parseMidenNetwork('testnet')).toBe('testnet');
    expect(parseMidenNetwork(' Mainnet ')).toBe('mainnet');
    expect(parseMidenNetwork('custom')).toBe('custom');
  });

  it('requires a known name', () => {
    expect(() => parseMidenNetwork(undefined)).toThrow(/NEXT_PUBLIC_MIDEN_NETWORK is not set/);
    expect(() => parseMidenNetwork('  ')).toThrow(/NEXT_PUBLIC_MIDEN_NETWORK is not set/);
    expect(() => parseMidenNetwork('moonnet')).toThrow(/must be one of/);
  });
});

describe('registration invitation code per network', () => {
  it('defaults: testnet 00000, devnet the configured code, mainnet none (required)', async () => {
    const { defaultInvitationCode, invitationCodeRequired, registrationInvitationCode } = await import('../src/lib/midenNetwork');
    expect(defaultInvitationCode('testnet', 'guardian')).toBe('00000');
    expect(defaultInvitationCode('devnet', 'guardian')).toBe('guardian');
    expect(defaultInvitationCode('mainnet', 'guardian')).toBe('');
    expect(invitationCodeRequired('mainnet')).toBe(true);
    expect(invitationCodeRequired('testnet')).toBe(false);
    // What the creator typed wins; otherwise the default.
    expect(registrationInvitationCode('testnet', 'guardian', ' mine ')).toBe('mine');
    expect(registrationInvitationCode('testnet', 'guardian', '')).toBe('00000');
    expect(registrationInvitationCode('mainnet', 'guardian', ' typed ')).toBe('typed');
    expect(() => registrationInvitationCode('mainnet', 'guardian', '  ')).toThrow(/invitation code is required/);
    // Public mainnet (invite-only switched off): no code required.
    expect(registrationInvitationCode('mainnet', 'guardian', '', false)).toBe('');
  });
});

describe('inviteOnly', () => {
  it('is on for mainnet by default, and the flag decides when set', async () => {
    const { inviteOnly } = await import('../src/lib/midenNetwork');
    expect(inviteOnly('mainnet', undefined)).toBe(true);
    expect(inviteOnly('mainnet', '0')).toBe(false);
    expect(inviteOnly('testnet', undefined)).toBe(false);
    expect(inviteOnly('testnet', '1')).toBe(true);
  });
});

describe('addressNetwork', () => {
  it('tells a network from the Bech32 prefix and refuses another network’s address', async () => {
    const { addressNetwork, assertAddressOnNetwork } = await import('../src/lib/midenNetwork');
    expect(addressNetwork('mm1arnfum9xuwwlrvgvrefejwvlavn3vk24')).toBe('mainnet');
    expect(addressNetwork('mtst1apxtmjhlua0s5vt5sg3ymtnyxclasaf0_qr7qqq9wr6w')).toBe('testnet');
    expect(addressNetwork('0x4cbdcaffe75f0a317482224dae6436')).toBeNull();
    expect(addressNetwork('@alex')).toBeNull();
    expect(() => assertAddressOnNetwork('mtst1apxtmjhlua0s5vt5sg3ymtnyxclasaf0', 'mainnet')).toThrow(/testnet address.*mainnet.*lost/);
    expect(() => assertAddressOnNetwork('mm1arnfum9xuwwlrvgvrefejwvlavn3vk24', 'mainnet')).not.toThrow();
    expect(() => assertAddressOnNetwork('0x4cbdcaffe75f0a317482224dae6436', 'mainnet')).not.toThrow();
  });
});

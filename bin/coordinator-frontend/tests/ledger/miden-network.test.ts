import { describe, expect, it } from 'vitest';
import { resolveMidenNetwork } from '../../src/lib/midenNetwork';

describe('resolveMidenNetwork', () => {
  it('infers the network from the RPC shorthand or host', () => {
    expect(resolveMidenNetwork(undefined, 'devnet')).toBe('devnet');
    expect(resolveMidenNetwork('', 'testnet')).toBe('testnet');
    expect(resolveMidenNetwork(undefined, 'https://rpc.testnet.miden.io')).toBe('testnet');
    expect(resolveMidenNetwork(undefined, 'http://localhost:57291')).toBe('local');
    expect(resolveMidenNetwork(undefined, 'https://rpc.example.org')).toBe('custom');
  });

  it('lets NEXT_PUBLIC_MIDEN_NETWORK override the inference', () => {
    expect(resolveMidenNetwork('Testnet', 'https://rpc.example.org')).toBe('testnet');
    expect(() => resolveMidenNetwork('moonnet', 'devnet')).toThrow(/NEXT_PUBLIC_MIDEN_NETWORK/);
  });
});

describe('registration invitation code per network', () => {
  it('defaults: testnet 00000, devnet the configured code, mainnet none (required)', async () => {
    const { defaultInvitationCode, invitationCodeRequired, registrationInvitationCode } = await import('../../src/lib/midenNetwork');
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
  });
});

import { describe, expect, it } from 'vitest';
import { staleKeys } from '@/lib/freshStartKeys';

describe('mainnet fresh start', () => {
  it('removes every testnet trace and keeps only personal preferences and the Privy public key', () => {
    const keys = [
      'miden-tg-wallet:last-view:tg:42',
      'miden-tg-wallet:first-paint:tg:42',
      'miden-tg-wallet:last-account',
      'miden-tg-wallet:last-account:0xabc',
      'miden-tg-wallet:contacts:0x425b318b78c4f6010e225b66b1c3e5',
      'miden-tg-wallet:token:0x4cbdcaffe75f0a317482224dae6436',
      'miden-tg-wallet:token-list:testnet',
      'miden-tg-wallet:pref:payment_alerts',
      'miden-tg-wallet:pref:directory',
      'miden-tg-wallet:pref:hide_amounts',
      'miden-tg-wallet:pref:sound',
      'miden-tg-wallet:pubkey:0xprivyaddress',
      'miden-tg-wallet:fresh-start:mainnet',
      'privy:token',
      'unrelated',
    ];
    expect(staleKeys(keys)).toEqual([
      'miden-tg-wallet:last-view:tg:42',
      'miden-tg-wallet:first-paint:tg:42',
      'miden-tg-wallet:last-account',
      'miden-tg-wallet:last-account:0xabc',
      'miden-tg-wallet:contacts:0x425b318b78c4f6010e225b66b1c3e5',
      'miden-tg-wallet:token:0x4cbdcaffe75f0a317482224dae6436',
      'miden-tg-wallet:token-list:testnet',
      'miden-tg-wallet:pref:payment_alerts',
      'miden-tg-wallet:pref:directory',
    ]);
  });
});

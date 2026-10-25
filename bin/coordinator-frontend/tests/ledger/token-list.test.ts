import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AccountId } from '@miden-sdk/miden-sdk';
import mainnet from '../../src/config/tokenList/mainnet.json';
import testnet from '../../src/config/tokenList/testnet.json';
import { hasTokenList, imitatedToken, listedToken, tokenVerification } from '../../src/lib/tokenList';
import { BECH32_PREFIX } from '../../src/lib/midenNetwork';

const hexOf = (address: string) => {
  const id = AccountId.fromBech32(address);
  try {
    return id.toString();
  } finally {
    id.free();
  }
};
const unlisted = '0xdeadc17b13b218c14cfa7801d10884';

describe('token list snapshot', () => {
  it.each([['mainnet', mainnet], ['testnet', testnet]] as const)('%s: one entry per faucet, on its network, logos shipped', (network, list) => {
    const ids = list.tokens.map((token) => token.faucetId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const token of list.tokens) {
      expect(token.network).toBe(network);
      expect(token.faucetId.startsWith(`${BECH32_PREFIX[network]}1`)).toBe(true);
      expect(token.faucetId).not.toContain('_');
      expect(hexOf(token.faucetId)).toMatch(/^0x[0-9a-f]{30}$/);
      if ('logoURI' in token && token.logoURI) {
        expect(existsSync(new URL(`../../src/config/tokenList/logos/${token.faucetId}.png`, import.meta.url))).toBe(true);
      }
    }
  });

  it('pins the token-list commit it was copied from', () => {
    const logos = readFileSync(new URL('../../src/config/tokenList/logos.ts', import.meta.url), 'utf8');
    expect(logos).toMatch(/TOKEN_LIST_COMMIT = '[0-9a-f]{40}'/);
  });
});

describe('listedToken', () => {
  it("finds a listed token by the hex ID the account's vault reports", () => {
    const usdt = mainnet.tokens.find((token) => token.symbol === 'USDT')!;
    expect(listedToken(hexOf(usdt.faucetId), 'mainnet')).toMatchObject({ symbol: 'USDT', name: 'Tether USD' });
  });

  it('finds nothing for an unlisted token, another network or a network without a list', () => {
    const usdt = mainnet.tokens.find((token) => token.symbol === 'USDT')!;
    expect(listedToken(unlisted, 'mainnet')).toBeUndefined();
    expect(listedToken(hexOf(usdt.faucetId), 'testnet')).toBeUndefined();
    expect(hasTokenList('devnet')).toBe(false);
    expect(listedToken(unlisted, 'devnet')).toBeUndefined();
  });
});

describe('tokenVerification', () => {
  it('verifies listed tokens and the fee token, and marks the rest on a listed network', () => {
    expect(tokenVerification(unlisted, 'mainnet', { token: mainnet.tokens[0] }, null)).toBe('verified');
    expect(tokenVerification(unlisted, 'mainnet', { token: undefined }, unlisted.toUpperCase().replace('0X', '0x'))).toBe('verified');
    expect(tokenVerification(unlisted, 'mainnet', { token: undefined }, '0xe69e6ca6e39df1b10c1e5399399feb')).toBe('unverified');
  });

  it('marks nothing before the lookup ran, before the fee token is known, or where there is no list', () => {
    expect(tokenVerification(unlisted, 'mainnet', undefined, null)).toBe('unknown');
    expect(tokenVerification(unlisted, 'mainnet', { token: undefined }, null)).toBe('unknown');
    expect(tokenVerification(unlisted, 'devnet', { token: undefined }, null)).toBe('unknown');
  });
});

describe('imitatedToken', () => {
  it("names the verified token whose symbol another one takes, in any case", () => {
    expect(imitatedToken(' usdt ', 'mainnet')?.name).toBe('Tether USD');
    expect(imitatedToken('NOTLISTED', 'mainnet')).toBeUndefined();
    expect(imitatedToken('', 'mainnet')).toBeUndefined();
    expect(imitatedToken('USDT', 'devnet')).toBeUndefined();
  });
});

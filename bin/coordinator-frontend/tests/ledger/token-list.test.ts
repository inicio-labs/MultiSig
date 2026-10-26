import { existsSync, readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountId } from '@miden-sdk/miden-sdk';
import mainnet from '../../src/config/tokenList/mainnet.json';
import testnet from '../../src/config/tokenList/testnet.json';
import {
  TOKEN_LIST_REFRESH_MS,
  hasTokenList,
  holdingsOrder,
  listedToken,
  parseTokenList,
  refreshTokenList,
  resetTokenLists,
  sendableTokens,
  tokenVerification,
} from '../../src/lib/tokenList';
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

beforeEach(() => resetTokenLists());

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

describe('sendableTokens', () => {
  const usdt = hexOf(mainnet.tokens.find((token) => token.symbol === 'USDT')!.faucetId);
  const eth = hexOf(mainnet.tokens.find((token) => token.symbol === 'ETH')!.faucetId);
  const fee = '0xe69e6ca6e39df1b10c1e5399399feb';
  const balances = [
    { faucetId: usdt, amount: 5n },
    { faucetId: eth, amount: 0n },
    { faucetId: fee, amount: 9n },
    { faucetId: unlisted, amount: 7n },
  ];

  it('offers the fee token and listed tokens with a balance, nothing else', () => {
    expect(sendableTokens(balances, 'mainnet', fee)).toEqual({ tokens: [balances[0], balances[2]], pending: false });
  });

  it('is pending while the fee token is unknown and an unlisted token could be it', () => {
    expect(sendableTokens(balances, 'mainnet', null)).toEqual({ tokens: [balances[0]], pending: true });
    expect(sendableTokens([balances[0]], 'mainnet', null)).toEqual({ tokens: [balances[0]], pending: false });
  });

  it('offers every token with a balance on a network without a list', () => {
    expect(sendableTokens(balances, 'devnet', null)).toEqual({ tokens: [balances[0], balances[2], balances[3]], pending: false });
  });
});

describe('parseTokenList', () => {
  it('accepts the shipped lists', () => {
    expect(parseTokenList(mainnet, 'mainnet')?.tokens).toHaveLength(mainnet.tokens.length);
    expect(parseTokenList(testnet, 'testnet')?.tokens).toHaveLength(testnet.tokens.length);
  });

  it('refuses a list with a token for another network, a bad address, a foreign logo or a repeat', () => {
    const token = mainnet.tokens[0];
    const withToken = (changed: Record<string, unknown>) => ({ ...mainnet, tokens: [{ ...token, ...changed }] });
    expect(parseTokenList(withToken({}), 'testnet')).toBeNull();
    expect(parseTokenList(withToken({ faucetId: 'mm1NOTBECH32' }), 'mainnet')).toBeNull();
    expect(parseTokenList(withToken({ logoURI: 'https://evil.example/logo.png' }), 'mainnet')).toBeNull();
    expect(parseTokenList(withToken({ decimals: 40 }), 'mainnet')).toBeNull();
    expect(parseTokenList({ ...mainnet, tokens: [token, token] }, 'mainnet')).toBeNull();
    expect(parseTokenList({ tokens: [] }, 'mainnet')).toBeNull();
  });
});

describe('refreshTokenList', () => {
  const usdt = mainnet.tokens.find((token) => token.symbol === 'USDT')!;
  const respond = (body: unknown, ok = true) => vi.fn(async () => ({ ok, json: async () => body }) as Response);
  const bumped = (minor: number, tokens: unknown[]) => ({ ...mainnet, version: { ...mainnet.version, minor: mainnet.version.minor + minor }, tokens });
  const newToken = { network: 'mainnet', faucetId: 'mm1aqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq', symbol: 'NEW', name: 'New Token', decimals: 6 };

  it('uses a newer live list: what it lists is listed, what it removed is not', async () => {
    const eth = mainnet.tokens.find((token) => token.symbol === 'ETH')!;
    const live = { ...mainnet, version: { major: mainnet.version.major + 1, minor: 0, patch: 0 }, tokens: [eth, newToken] };
    const fetchList = respond(live);
    expect(await refreshTokenList('mainnet', fetchList, 1_000)).toBe(true);
    expect(fetchList).toHaveBeenCalledWith('https://raw.githubusercontent.com/0xMiden/token-list/main/mainnet.json', { cache: 'no-cache' });
    expect(listedToken(hexOf(eth.faucetId), 'mainnet')?.symbol).toBe('ETH');
    expect(listedToken(hexOf(usdt.faucetId), 'mainnet')).toBeUndefined();
  });

  it('keeps the list in use when the live one is older, invalid or unreachable', async () => {
    const older = { ...mainnet, version: { major: 0, minor: 0, patch: 0 }, tokens: [] };
    expect(await refreshTokenList('mainnet', respond(older), 1_000)).toBe(false);
    expect(await refreshTokenList('mainnet', respond({ tokens: 'nope' }), 1_000 + TOKEN_LIST_REFRESH_MS)).toBe(false);
    expect(await refreshTokenList('mainnet', respond(null, false), 1_000 + 2 * TOKEN_LIST_REFRESH_MS)).toBe(false);
    expect(await refreshTokenList('mainnet', vi.fn(async () => { throw new TypeError('Failed to fetch'); }), 1_000 + 3 * TOKEN_LIST_REFRESH_MS)).toBe(false);
    expect(listedToken(hexOf(usdt.faucetId), 'mainnet')?.symbol).toBe('USDT');
  });

  it('reads the live list at most once a minute', async () => {
    const fetchList = respond(bumped(1, mainnet.tokens));
    await refreshTokenList('mainnet', fetchList, 1_000);
    await refreshTokenList('mainnet', fetchList, 1_000 + TOKEN_LIST_REFRESH_MS - 1);
    expect(fetchList).toHaveBeenCalledTimes(1);
    await refreshTokenList('mainnet', fetchList, 1_000 + TOKEN_LIST_REFRESH_MS);
    expect(fetchList).toHaveBeenCalledTimes(2);
  });

  it('reports no change when the live list lists the same tokens', async () => {
    expect(await refreshTokenList('mainnet', respond(bumped(0, mainnet.tokens)), 1_000)).toBe(false);
  });

  it('does nothing on a network without a list', async () => {
    const fetchList = respond(mainnet);
    expect(await refreshTokenList('devnet', fetchList, 1_000)).toBe(false);
    expect(fetchList).not.toHaveBeenCalled();
  });
});

describe('holdingsOrder', () => {
  const hex = (symbol: string) => hexOf(mainnet.tokens.find((token) => token.symbol === symbol)!.faucetId);
  const fee = '0xe69e6ca6e39df1b10c1e5399399feb';

  it('puts the fee token first, then listed tokens by name, then the rest in their order; no zero balances', () => {
    const balances = [
      { faucetId: unlisted, amount: 7n },
      { faucetId: hex('USDT'), amount: 5n },
      { faucetId: '0x7cf0a4456218bfb111c55a10d5435a', amount: 3n },
      { faucetId: hex('ETH'), amount: 2n },
      { faucetId: fee, amount: 9n },
      { faucetId: hex('WBTC'), amount: 0n },
    ];
    expect(holdingsOrder(balances, 'mainnet', fee).map((b) => b.faucetId)).toEqual([
      fee, hex('ETH'), hex('USDT'), unlisted, '0x7cf0a4456218bfb111c55a10d5435a',
    ]);
  });
});

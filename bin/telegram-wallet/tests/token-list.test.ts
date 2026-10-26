import { describe, expect, it, vi } from 'vitest';
import { createTokenList, parseTokenList, tokenListUrl } from '@/lib/tokenList';
import { getTokenInfo, type TokenSource } from '@/lib/tokenAmounts';

// Stands in for the SDK's bech32 → hex (which needs WebAssembly).
const HEX: Record<string, string> = {
  mtst1usdcx: '0x4CBDCAFFE75F0A317482224DAE6436',
  mtst1gc: '0x1111111111111111111111111111aa',
  mm1usdt: '0x2222222222222222222222222222bb',
};
const toHex = (id: string) => { const h = HEX[id]; if (!h) throw new Error('bad bech32'); return h; };

const LIST = {
  version: { major: 1, minor: 2, patch: 0 },
  tokens: [
    { faucetId: 'mtst1usdcx', symbol: 'USDCX', decimals: 6, name: 'USD Coin X', network: 'testnet' },
    { faucetId: 'mtst1gc', symbol: 'GC', decimals: 6, name: 'Gas Coin', network: 'testnet', logoURI: 'https://x/gc.png' },
    { faucetId: 'mm1usdt', symbol: 'USDT', decimals: 6, name: 'Tether', network: 'mainnet' },
    { faucetId: 'mtst1bad', symbol: 'BAD', decimals: 6, network: 'testnet' },
    { faucetId: 'mtst1gc', symbol: '', decimals: 6, network: 'testnet' },
    { faucetId: 'mtst1gc', symbol: 'TOOMANY', decimals: 19, network: 'testnet' },
    { faucetId: 'mtst1gc', symbol: 'FRAC', decimals: 6.5, network: 'testnet' },
  ],
};

describe('parseTokenList', () => {
  it('keeps the network’s valid entries, hex ids lowercase, and skips bad ones', () => {
    const tokens = parseTokenList(LIST, 'testnet', toHex);
    expect(tokens).toEqual([
      { faucetId: '0x4cbdcaffe75f0a317482224dae6436', symbol: 'USDCX', decimals: 6, name: 'USD Coin X' },
      { faucetId: '0x1111111111111111111111111111aa', symbol: 'GC', decimals: 6, name: 'Gas Coin', logoURI: 'https://x/gc.png' },
    ]);
    expect(parseTokenList(LIST, 'mainnet', toHex).map((t) => t.symbol)).toEqual(['USDT']);
    expect(parseTokenList({ nope: 1 }, 'testnet', toHex)).toEqual([]);
    expect(parseTokenList(null, 'testnet', toHex)).toEqual([]);
  });

  it('reads from the 0xMiden token-list repository', () => {
    expect(tokenListUrl('testnet')).toBe('https://raw.githubusercontent.com/0xMiden/token-list/main/testnet.json');
  });
});

function fakeStore() {
  const map = new Map<string, string>();
  return { map, get: (k: string) => map.get(k) ?? null, set: (k: string, v: string) => { map.set(k, v); } };
}

describe('createTokenList', () => {
  it('fetches once per open and finds a listed faucet by hex id (any case)', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(LIST), { status: 200 })) as unknown as typeof fetch;
    const store = fakeStore();
    const list = createTokenList({ network: 'testnet', toHex, fetchImpl, store });
    expect((await list.listed('0x4CBDCAFFE75F0A317482224DAE6436'))?.symbol).toBe('USDCX');
    expect(await list.listed('0x' + '33'.repeat(15))).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(JSON.parse(store.map.get('miden-tg-wallet:token-list:testnet')!).tokens).toHaveLength(2);
  });

  it('falls back to the phone’s last copy when GitHub fails, and to nothing when there is none', async () => {
    const store = fakeStore();
    store.set('miden-tg-wallet:token-list:testnet', JSON.stringify({ fetchedAt: 1, tokens: parseTokenList(LIST, 'testnet', toHex) }));
    const failing = vi.fn(async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect((await createTokenList({ network: 'testnet', toHex, fetchImpl: failing, store }).listed('0x4cbdcaffe75f0a317482224dae6436'))?.symbol).toBe('USDCX');
    expect(await createTokenList({ network: 'testnet', toHex, fetchImpl: failing, store: fakeStore() }).tokens()).toEqual([]);
    const http500 = vi.fn(async () => new Response('x', { status: 500 })) as unknown as typeof fetch;
    expect(await createTokenList({ network: 'testnet', toHex, fetchImpl: http500, store: fakeStore() }).tokens()).toEqual([]);
    warn.mockRestore();
  });

  it('never fetches for a network without a list', async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    expect(await createTokenList({ network: 'devnet', toHex, fetchImpl }).tokens()).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('getTokenInfo: list, then chain, then the known fee token', () => {
  const USDCX = '0x4cbdcaffe75f0a317482224dae6436';
  const source = (over: Partial<TokenSource>): TokenSource => ({
    listed: async () => null,
    chain: async () => { throw new Error('storage map slot has too many entries'); },
    known: () => null,
    ...over,
  });

  it('prefers the list', async () => {
    const chain = vi.fn(async () => ({ decimals: 6, symbol: 'CHAIN' }));
    const info = await getTokenInfo('0x' + 'a1'.repeat(15), 1000, source({
      listed: async () => ({ faucetId: USDCX, symbol: 'USDCX', decimals: 6, name: 'USDCX' }),
      chain,
    }));
    expect(info).toEqual({ decimals: 6, symbol: 'USDCX' });
    expect(chain).not.toHaveBeenCalled();
  });

  it('reads the chain when the faucet is not listed', async () => {
    expect(await getTokenInfo('0x' + 'a2'.repeat(15), 1000, source({ chain: async () => ({ decimals: 8, symbol: 'IBTC' }) })))
      .toEqual({ decimals: 8, symbol: 'IBTC' });
  });

  it('uses the known fee token only when both fail, and otherwise fails closed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await getTokenInfo('0x' + 'a3'.repeat(15), 1000, source({ known: () => ({ decimals: 6, symbol: 'USDCX' }) })))
      .toEqual({ decimals: 6, symbol: 'USDCX' });
    await expect(getTokenInfo('0x' + 'a4'.repeat(15), 1000, source({}))).rejects.toThrow(/too many entries/);
    warn.mockRestore();
  });
});

import { ed25519 } from '@noble/curves/ed25519';
import { describe, expect, it } from 'vitest';
import { readDirectoryProof } from '@/lib/telegramProof';
import { readDirectoryProof as serverReadProof } from '../alerts/verify.mjs';

const BOT_ID = '8677312209';
const secret = ed25519.utils.randomPrivateKey();
const publicKey = Buffer.from(ed25519.getPublicKey(secret)).toString('hex');
const ADDRESS = '0xfeccdfa1fae10dc115ee2ab914df44';

function launch(fields: Record<string, string>, botId = BOT_ID): string {
  const check = `${botId}:WebAppData\n` + Object.entries(fields).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('\n');
  const signature = Buffer.from(ed25519.sign(new TextEncoder().encode(check), secret)).toString('base64url');
  return new URLSearchParams({ ...fields, hash: 'a'.repeat(64), signature }).toString();
}

const user = JSON.stringify({ id: 4242, first_name: 'Alex', username: 'Alex_P' });
const fields = { user, auth_date: '1791800000', start_param: `reg_${ADDRESS}`, query_id: 'q' };

describe('directory proofs (Telegram Ed25519)', () => {
  it('reads who registered which address, on the phone and on the server alike', () => {
    const proof = launch(fields);
    expect(readDirectoryProof(proof, BOT_ID, publicKey)).toEqual({
      userId: '4242', username: 'alex_p', name: 'Alex', address: ADDRESS, network: null, registeredAt: 1_791_800_000_000,
    });
    expect(serverReadProof(proof, BOT_ID, publicKey)).toEqual({ userId: '4242', username: 'alex_p', address: ADDRESS });
  });

  it('carries the network when the link holds a Bech32 address', () => {
    const mainnet = 'mm1arnfum9xuwwlrvgvrefejwvlavn3vk24_qr7qqq9wr6w';
    const proof = launch({ ...fields, start_param: `reg_${mainnet}` });
    expect(readDirectoryProof(proof, BOT_ID, publicKey)).toMatchObject({ address: mainnet, network: 'mainnet' });
    expect(serverReadProof(proof, BOT_ID, publicKey)).toEqual({ userId: '4242', username: 'alex_p', address: mainnet });
    const testnet = launch({ ...fields, start_param: 'reg_mtst1apxtmjhlua0s5vt5sg3ymtnyxclasaf0' });
    expect(readDirectoryProof(testnet, BOT_ID, publicKey)).toMatchObject({ network: 'testnet' });
    expect(readDirectoryProof(launch({ ...fields, start_param: 'reg_MM1UPPER' }), BOT_ID, publicKey)).toBeNull();
  });

  it('rejects a changed address, another bot, a non-registration launch, or no signature', () => {
    const swapped = launch(fields).replace(ADDRESS.slice(2), 'deadbeef'.repeat(4).slice(0, 30));
    expect(readDirectoryProof(swapped, BOT_ID, publicKey)).toBeNull();
    expect(serverReadProof(swapped, BOT_ID, publicKey)).toBeNull();
    expect(readDirectoryProof(launch(fields, '1111'), BOT_ID, publicKey)).toBeNull();
    expect(readDirectoryProof(launch({ ...fields, start_param: 'pay_x' }), BOT_ID, publicKey)).toBeNull();
    expect(readDirectoryProof(new URLSearchParams(fields).toString(), BOT_ID, publicKey)).toBeNull();
  });
});

describe('entryForNetwork', () => {
  it('pays only entries of this network, hex ids counting as testnet', async () => {
    const { entryForNetwork } = await import('@/lib/telegramProof');
    const toHex = (a: string) => (a.startsWith('0x') ? a : '0x' + 'ab'.repeat(15));
    const base = { userId: '1', username: 'a', name: 'A', registeredAt: 1 };
    const hexEntry = { ...base, address: '0xfeccdfa1fae10dc115ee2ab914df44', network: null };
    expect(entryForNetwork(hexEntry, 'testnet', toHex)?.address).toBe('0xfeccdfa1fae10dc115ee2ab914df44');
    expect(entryForNetwork(hexEntry, 'mainnet', toHex)).toBeNull();
    expect(entryForNetwork({ ...base, address: 'mtst1apxtmjhlua0s5vt5sg3ymtnyxclasaf0', network: 'testnet' }, 'mainnet', toHex)).toBeNull();
    expect(entryForNetwork({ ...base, address: 'mm1arnfum9xuwwlrvgvrefejwvlavn3vk24', network: 'mainnet' }, 'mainnet', toHex)?.address).toBe('0x' + 'ab'.repeat(15));
    expect(entryForNetwork({ ...base, address: 'mm1bad', network: 'mainnet' }, 'mainnet', () => { throw new Error('bad'); })).toBeNull();
    expect(entryForNetwork(null, 'mainnet', toHex)).toBeNull();
  });
});

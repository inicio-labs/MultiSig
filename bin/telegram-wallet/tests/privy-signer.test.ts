import { describe, expect, it } from 'vitest';
import * as M from '@miden-sdk/miden-sdk';
import { EcdsaSigner } from '@openzeppelin/miden-multisig-client';
import { RequestAuthPayload } from '@openzeppelin/guardian-client';
import { hexToBytes, type Hex } from 'viem';
import { privateKeyToAddress, sign } from 'viem/accounts';
import { createPrivySigner, type RawHashProvider } from '@/lib/privySigner';

// Stands in for Privy's embedded wallet: `secp256k1_sign` signs the raw 32-byte
// hash it is given, the way viem's `sign` does (r || s || v, v = 27/28).
function fakePrivyProvider(privateKey: Hex, { recoveryAs01 = false } = {}) {
  const calls: string[] = [];
  const provider: RawHashProvider = {
    async request({ method, params }) {
      calls.push(method);
      if (method !== 'secp256k1_sign') throw new Error(`unexpected ${method}`);
      const signature = await sign({ hash: (params as [Hex])[0], privateKey, to: 'hex' });
      if (!recoveryAs01) return signature;
      const v = parseInt(signature.slice(-2), 16) - 27;
      return `${signature.slice(0, -2)}${v.toString(16).padStart(2, '0')}`;
    },
  };
  return { provider, calls };
}

const PRIVATE_KEY: Hex = '0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318';
const OTHER_KEY: Hex = '0x8da4ef21b864d2cc526dbdb2a120bd2874c36c9d0a1fb7f8c63d7f7a8b41de8f';
const ADDRESS = privateKeyToAddress(PRIVATE_KEY);
const ACCOUNT_ID = '0x6193fede3d413581448dbceed2be2b';
const COMMITMENT = '0x' + '1f'.repeat(32);

// The Miden SDK's own ECDSA signer for the same private key: the reference.
function midenSigner(privateKey: Hex) {
  const bytes = new Uint8Array(33);
  bytes[0] = 1;
  bytes.set(hexToBytes(privateKey), 1);
  return new EcdsaSigner(M.AuthSecretKey.deserialize(bytes));
}

const strip = (hex: string) => hex.replace(/^0x/, '').toLowerCase();

describe('createPrivySigner', () => {
  const reference = midenSigner(PRIVATE_KEY);

  it.each([false, true])('derives the same key and commitment as the Miden SDK (v as 0/1: %s)', async (recoveryAs01) => {
    const { provider } = fakePrivyProvider(PRIVATE_KEY, { recoveryAs01 });
    const { signer } = await createPrivySigner({ address: ADDRESS, provider });
    expect(signer.scheme).toBe('ecdsa');
    expect(strip(signer.publicKey)).toBe(strip(reference.publicKey));
    expect(signer.commitment).toBe(reference.commitment);
  });

  it('produces the Miden SDK signature for every message the multisig signs', async () => {
    const { provider } = fakePrivyProvider(PRIVATE_KEY);
    const { signer } = await createPrivySigner({ address: ADDRESS, provider });
    const payload = RequestAuthPayload.fromRequest({ account_id: ACCOUNT_ID, nonce: 7 });
    const ts = 1_791_600_000_000;

    expect(strip(await signer.signCommitment(COMMITMENT))).toBe(strip(await reference.signCommitment(COMMITMENT)));
    expect(strip(await signer.signRequest!(ACCOUNT_ID, ts, payload))).toBe(strip(await reference.signRequest(ACCOUNT_ID, ts, payload)));
    expect(strip(await signer.signAccountIdWithTimestamp(ACCOUNT_ID, ts))).toBe(strip(await reference.signAccountIdWithTimestamp(ACCOUNT_ID, ts)));
    expect(strip(await signer.signLookupMessage!(reference.commitment, ts))).toBe(strip(await reference.signLookupMessage(reference.commitment, ts)));
  });

  it('signs commitments that the Miden SDK verifies', async () => {
    const { provider } = fakePrivyProvider(PRIVATE_KEY);
    const { signer } = await createPrivySigner({ address: ADDRESS, provider });
    const signature = hexToBytes((await signer.signCommitment(COMMITMENT)) as Hex);
    const withScheme = (bytes: Uint8Array) => Uint8Array.from([1, ...bytes]);
    const publicKey = M.PublicKey.deserialize(withScheme(hexToBytes(signer.publicKey as Hex)));
    const message = M.Word.fromHex(COMMITMENT);
    expect(publicKey.verify(message, M.Signature.deserialize(withScheme(signature)))).toBe(true);
    expect(publicKey.verify(M.Word.fromHex('0x' + '2e'.repeat(32)), M.Signature.deserialize(withScheme(signature)))).toBe(false);
  });

  it('skips the discovery signature when given the cached public key', async () => {
    const first = await createPrivySigner({ address: ADDRESS, provider: fakePrivyProvider(PRIVATE_KEY).provider });
    const { provider, calls } = fakePrivyProvider(PRIVATE_KEY);
    const { signer } = await createPrivySigner({ address: ADDRESS, provider, publicKey: first.publicKey });
    expect(calls).toEqual([]);
    expect(signer.commitment).toBe(reference.commitment);
  });

  it('rejects a wallet whose key does not match the address', async () => {
    await expect(createPrivySigner({ address: ADDRESS, provider: fakePrivyProvider(OTHER_KEY).provider }))
      .rejects.toThrow('does not match its address');
    const other = await createPrivySigner({
      address: privateKeyToAddress(OTHER_KEY),
      provider: fakePrivyProvider(OTHER_KEY).provider,
    });
    await expect(createPrivySigner({ address: ADDRESS, provider: fakePrivyProvider(PRIVATE_KEY).provider, publicKey: other.publicKey }))
      .rejects.toThrow('does not match its address');
  });

  it('rejects a malformed signature', async () => {
    const provider: RawHashProvider = { request: async () => '0x1234' };
    await expect(createPrivySigner({ address: ADDRESS, provider })).rejects.toThrow('invalid secp256k1 signature');
  });
});

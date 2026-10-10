import { getWasmOrThrow } from '@miden-sdk/miden-sdk';
import type { Hex } from 'viem';
import { generatePrivateKey, privateKeyToAddress, sign } from 'viem/accounts';
import { createPrivySigner, type PrivySigner } from './privySigner';
import { storage } from './storage';

/**
 * Development only: a browser-held key that answers `secp256k1_sign` the way
 * Privy's embedded wallet does, through the same signer adapter. It lets the
 * whole wallet run against a real Guardian before a Privy app exists. The key
 * sits unencrypted in localStorage, so production builds refuse it.
 */
export const DEV_LOCAL_SIGNER =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEV_LOCAL_SIGNER === '1';

const KEY = 'miden-tg-wallet:dev-private-key';

export async function createDevSigner(): Promise<PrivySigner> {
  if (!DEV_LOCAL_SIGNER) throw new Error('The development signer is disabled.');
  let privateKey = storage.get(KEY) as Hex | null;
  if (!privateKey) {
    privateKey = generatePrivateKey();
    storage.set(KEY, privateKey);
  }
  const key = privateKey;
  await getWasmOrThrow();
  return createPrivySigner({
    address: privateKeyToAddress(key),
    provider: {
      async request({ method, params }) {
        if (method !== 'secp256k1_sign') throw new Error(`Unsupported method ${method}`);
        return sign({ hash: (params as [Hex])[0], privateKey: key, to: 'hex' });
      },
    },
  });
}

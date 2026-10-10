import {
  EcdsaFormat,
  ParaSigner,
  tryComputeEcdsaCommitmentHex,
  type Signer,
} from '@openzeppelin/miden-multisig-client';
import { bytesToHex, getAddress, keccak256, recoverPublicKey, type Hex } from 'viem';
import { publicKeyToAddress } from 'viem/accounts';

/** The part of an EIP-1193 provider we use: Privy's embedded wallet answers `secp256k1_sign`. */
export interface RawHashProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

export interface PrivySignerOptions {
  /** The embedded wallet's Ethereum address. */
  address: string;
  provider: RawHashProvider;
  /**
   * The uncompressed public key returned by an earlier call. Skips the
   * key-discovery signature; it is checked against `address`.
   */
  publicKey?: Hex;
}

export interface PrivySigner {
  signer: Signer;
  /** Uncompressed (65-byte) public key, safe to cache: it is public. */
  publicKey: Hex;
}

/**
 * A multisig signer backed by a Privy embedded wallet.
 *
 * The multisig's ECDSA scheme signs `keccak256(word bytes)` with no EIP-191
 * prefix. `ParaSigner` already computes that digest and hands it to its
 * context as `messageBase64`, so this only adapts Privy's raw-hash signing
 * (`secp256k1_sign`) to that context and keeps the digest and signature
 * handling on the same code path as Para. `personal_sign` would prefix the
 * message and never verify.
 *
 * The commitment comes from the Miden SDK's WASM, which loads lazily: in the
 * browser, await `getWasmOrThrow()` first.
 */
export async function createPrivySigner({ address, provider, publicKey }: PrivySignerOptions): Promise<PrivySigner> {
  const signHash = (hash: Hex) => signRawHash(provider, hash);
  const uncompressed = publicKey ?? await discoverPublicKey(signHash);
  if (!isUncompressedKey(uncompressed) || getAddress(publicKeyToAddress(uncompressed)) !== getAddress(address)) {
    throw new Error('Wallet public key does not match its address');
  }
  const compressed = EcdsaFormat.compressPublicKey(uncompressed);
  const commitment = tryComputeEcdsaCommitmentHex(compressed);
  if (!commitment) throw new Error('Cannot derive the Miden commitment for the wallet public key');

  const signer = new ParaSigner(
    {
      signMessage: async ({ messageBase64 }) => ({ signature: await signHash(bytesToHex(base64ToBytes(messageBase64))) }),
    },
    address,
    commitment,
    compressed,
  );
  return { signer, publicKey: uncompressed };
}

async function signRawHash(provider: RawHashProvider, hash: Hex): Promise<Hex> {
  const result = await provider.request({ method: 'secp256k1_sign', params: [hash] });
  if (typeof result !== 'string' || !/^0x[0-9a-fA-F]{130}$/.test(result)) {
    throw new Error('Wallet returned an invalid secp256k1 signature');
  }
  return result as Hex;
}

/** Sign a random challenge and recover the key that produced the signature. */
async function discoverPublicKey(signHash: (hash: Hex) => Promise<Hex>): Promise<Hex> {
  const hash = keccak256(crypto.getRandomValues(new Uint8Array(32)));
  return recoverPublicKey({ hash, signature: await signHash(hash) });
}

function isUncompressedKey(key: string): key is Hex {
  return /^0x04[0-9a-fA-F]{128}$/.test(key) && EcdsaFormat.isValidPublicKeyPoint(key);
}

function base64ToBytes(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

import { AccountId, AccountInterface, NetworkId } from '@miden-sdk/miden-sdk';
import { MIDEN_NETWORK } from '@/config/psm';
import { BECH32_PREFIX } from './midenNetwork';

function networkId(): NetworkId {
  switch (MIDEN_NETWORK) {
    case 'mainnet': return NetworkId.mainnet();
    case 'testnet': return NetworkId.testnet();
    case 'devnet': return NetworkId.devnet();
    default: return NetworkId.custom(BECH32_PREFIX[MIDEN_NETWORK]);
  }
}

/** The account's address as people share it (mtst1… on testnet). */
export function accountAddress(accountId: string): string {
  return AccountId.fromHex(accountId).toBech32(networkId(), AccountInterface.BasicWallet);
}

export function shortAddress(address: string): string {
  return address.length > 20 ? `${address.slice(0, 10)}…${address.slice(-6)}` : address;
}

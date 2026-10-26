import type { Signer } from '@openzeppelin/miden-multisig-client';
import type { Hex } from 'viem';
import { generatePrivateKey, privateKeyToAddress, sign } from 'viem/accounts';
import { createPrivySigner } from './privySigner';
import { storage } from './storage';
import { thisPhone } from './thisPhone';
import type { WalletEngine } from './walletEngine';

/**
 * Development only (window.recoveryDev, with the development signer): runs
 * recovery setup on testnet before its screens exist. A local key stands in
 * for the recovery email key (the real one lives on the recovery origin).
 */
const EMAIL_KEY = 'miden-tg-wallet:dev-email-key';

async function devEmailSigner(): Promise<Signer> {
  let key = storage.get(EMAIL_KEY) as Hex | null;
  if (!key) {
    key = generatePrivateKey();
    storage.set(EMAIL_KEY, key);
  }
  const privateKey = key;
  const { signer } = await createPrivySigner({
    address: privateKeyToAddress(privateKey),
    provider: { request: async ({ params }) => sign({ hash: (params as [Hex])[0], privateKey, to: 'hex' }) },
  });
  return signer;
}

export function devRecovery(engine: WalletEngine) {
  return {
    async setUp() {
      const phone = await thisPhone.create();
      const email = await devEmailSigner();
      console.info('[recovery] phone', phone.commitment, 'email', email.commitment);
      await engine.setUpRecovery({ phone: phone.commitment, email: email.commitment }, (done, total) => {
        console.info(`[recovery] step ${done + 1} of ${total}`);
      });
      console.info('[recovery] on', engine.getSnapshot().recovery);
    },
  };
}

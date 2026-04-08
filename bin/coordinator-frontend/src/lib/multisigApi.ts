import {
  type Multisig,
  type MultisigClient,
  type MultisigConfig,
  type ProcedureThreshold,
  type ParaSigningContext,
  type WalletSigningContext,
  MultisigClient as MultisigClientClass,
  FalconSigner,
  EcdsaSigner,
  ParaSigner,
  MidenWalletSigner,
  type SignatureScheme,
} from '@openzeppelin/miden-multisig-client';
import type { Signer } from '@openzeppelin/guardian-client';
import type { WebClient } from '@miden-sdk/miden-sdk';
import type { SignerInfo } from '@/types/guardian';
import type { WalletSource } from '@/wallets/types';
import { normalizeCommitment } from '@/lib/helpers';

export interface ExternalSignerParams {
  walletSource: WalletSource;
  paraContext?: { para: ParaSigningContext; walletId: string; commitment: string; publicKey: string };
  midenWalletContext?: { wallet: WalletSigningContext; commitment: string; scheme: SignatureScheme; publicKey?: string };
}

export function createSigner(
  signerInfo: SignerInfo,
  signatureScheme: SignatureScheme,
  external?: ExternalSignerParams,
): Signer {
  if (external?.walletSource === 'para' && external.paraContext) {
    const ctx = external.paraContext;
    return new ParaSigner(ctx.para, ctx.walletId, ctx.commitment, ctx.publicKey);
  }

  if (external?.walletSource === 'miden-wallet' && external.midenWalletContext) {
    const ctx = external.midenWalletContext;
    if (ctx.scheme === 'ecdsa') {
      const localSigner = new EcdsaSigner(signerInfo.ecdsa.secretKey);
      return new MidenWalletSigner(ctx.wallet, ctx.commitment, ctx.scheme, localSigner, ctx.publicKey);
    }
    return new MidenWalletSigner(ctx.wallet, ctx.commitment, ctx.scheme, undefined, ctx.publicKey);
  }

  const activeSigner = signatureScheme === 'ecdsa' ? signerInfo.ecdsa : signerInfo.falcon;
  return signatureScheme === 'ecdsa'
    ? new EcdsaSigner(activeSigner.secretKey)
    : new FalconSigner(activeSigner.secretKey);
}

export async function initMultisigClient(
  webClient: WebClient,
  guardianEndpoint: string,
  scheme?: SignatureScheme,
): Promise<{ client: MultisigClient; guardianCommitment: string; guardianPubkey?: string }> {
  const client = new MultisigClientClass(webClient, { guardianEndpoint });
  const { commitment, pubkey } = await client.guardianClient.getPubkey(scheme);
  return { client, guardianCommitment: commitment, guardianPubkey: pubkey };
}

export async function createMultisigAccount(
  multisigClient: MultisigClient,
  signerCommitment: string,
  otherCommitments: string[],
  threshold: number,
  guardianCommitment: string,
  signer: Signer,
  guardianPublicKey?: string,
  procedureThresholds?: ProcedureThreshold[],
  signatureScheme: SignatureScheme = 'falcon',
): Promise<Multisig> {
  const signerCommitments = [signerCommitment, ...otherCommitments].map(normalizeCommitment);
  const config: MultisigConfig = {
    threshold,
    signerCommitments,
    guardianCommitment,
    guardianPublicKey,
    guardianEnabled: true,
    procedureThresholds,
    storageMode: 'private',
    signatureScheme,
  };
  return multisigClient.create(config, signer);
}

export async function loadMultisigAccount(
  multisigClient: MultisigClient,
  accountId: string,
  signer: Signer,
  guardianPublicKey?: string,
): Promise<Multisig> {
  const multisig = await multisigClient.load(accountId, signer);
  if (guardianPublicKey) {
    multisig.guardianPublicKey = guardianPublicKey;
  }
  return multisig;
}

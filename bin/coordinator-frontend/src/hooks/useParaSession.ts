'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAccount, useClient } from '@getpara/react-sdk-lite';
import { tryComputeEcdsaCommitmentHex, EcdsaFormat } from '@openzeppelin/miden-multisig-client';
import type { ExternalWalletState } from '@/wallets/types';

interface WalletWithPublicKey {
  id: string;
  publicKey?: string;
}

async function getUncompressedPublicKeyFromWallet(
  para: { issueJwt(): Promise<{ token: string }> },
  wallet: WalletWithPublicKey,
): Promise<string> {
  let publicKey = wallet.publicKey;
  if (!publicKey) {
    const { token } = await para.issueJwt();
    const payload = JSON.parse(window.atob(token.split('.')[1]));
    if (!payload.data) {
      throw new Error('Got invalid jwt token');
    }
    const wallets: Array<{ id: string; publicKey: string }> = payload.data.connectedWallets;
    const w = wallets.find((w) => w.id === wallet.id);
    if (!w) {
      throw new Error('Wallet Not Found in jwt data');
    }
    publicKey = w.publicKey;
  }
  return publicKey;
}

export function useParaSession() {
  const [session, setSession] = useState<ExternalWalletState>({
    source: 'para',
    connected: false,
    publicKey: null,
    commitment: null,
    scheme: null,
  });

  // Para's own hooks, not @miden-sdk/para-react's useParaMiden: that one also
  // builds a second Miden client and wallet account on every Para login (a
  // second SDK start and chain sync, against the testnet note transport unless
  // told otherwise, which the CSP blocks on mainnet: it then fails, says "Para
  // connection failed" and starts over whenever the wallet list changes). The
  // app uses Para only to sign: the client and the EVM wallets are all it needs.
  const paraClient = useClient();
  const { embedded } = useAccount();
  const evmWallets = useMemo(() => embedded.wallets?.filter((wallet) => wallet.type === 'EVM'), [embedded.wallets]);
  const derivingRef = useRef(false);

  useEffect(() => {
    if (!evmWallets?.length) {
      setSession((prev) => ({ ...prev, connected: false, publicKey: null, commitment: null }));
      return;
    }

    const evmWallet = evmWallets[0];
    if (!paraClient || derivingRef.current) return;

    derivingRef.current = true;
    (async () => {
      try {
        const uncompressedPk = await getUncompressedPublicKeyFromWallet(paraClient, evmWallet);
        const compressedPk = EcdsaFormat.compressPublicKey(uncompressedPk);
        const commitmentHex = tryComputeEcdsaCommitmentHex(compressedPk);
        if (!commitmentHex) {
          throw new Error('Failed to derive ECDSA commitment from public key');
        }

        setSession({
          source: 'para',
          connected: true,
          publicKey: uncompressedPk,
          commitment: commitmentHex,
          scheme: 'ecdsa',
        });
      } catch {
        setSession((prev) => ({ ...prev, connected: false }));
      } finally {
        derivingRef.current = false;
      }
    })();
  }, [evmWallets, paraClient]);

  const getWalletId = useCallback((): string | null => {
    return evmWallets?.[0]?.id ?? null;
  }, [evmWallets]);

  return {
    session,
    paraClient,
    getWalletId,
  };
}

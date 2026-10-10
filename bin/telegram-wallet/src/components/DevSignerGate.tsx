'use client';

import { useEffect, useState } from 'react';
import type { Signer } from '@openzeppelin/miden-multisig-client';
import { createDevSigner } from '@/lib/devSigner';
import { formatError } from '@/lib/errors';
import { Screens } from './Screens';
import { Fatal, Splash } from './Splash';
import { WalletProvider } from './WalletProvider';

/** Development only: the wallet with a browser-held key instead of Privy (see devSigner.ts). */
export function DevSignerGate() {
  const [signer, setSigner] = useState<Signer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createDevSigner().then((result) => setSigner(result.signer), (e: unknown) => setError(formatError(e)));
  }, []);

  if (error) return <Fatal title="Development signer failed" message={error} />;
  if (!signer) return <Splash label="Development signer…" />;
  return (
    <WalletProvider signer={signer}>
      <Screens />
    </WalletProvider>
  );
}

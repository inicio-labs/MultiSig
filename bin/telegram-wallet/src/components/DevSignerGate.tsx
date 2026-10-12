'use client';

import { useEffect, useState } from 'react';
import type { Signer } from '@openzeppelin/miden-multisig-client';
import { createDevSigner } from '@/lib/devSigner';
import { formatError } from '@/lib/errors';
import { Gate } from './AuthGate';
import { Fatal, Splash } from './Splash';

/** Development only: a browser-held key instead of Privy (see devSigner.ts), handed up like AuthGate's. */
export function DevSignerGate({ onSigner, preview }: { onSigner(signer: Signer | null): void; preview: boolean }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createDevSigner().then((result) => {
      onSigner(result.signer);
      setReady(true);
    }, (e: unknown) => setError(formatError(e)));
  }, [onSigner]);

  if (error) return <Gate><Fatal title="Development signer failed" message={error} /></Gate>;
  if (!ready && !preview) return <Gate><Splash label="Development signer…" /></Gate>;
  return null;
}

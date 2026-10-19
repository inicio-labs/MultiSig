'use client';

import { useEffect, useState } from 'react';
import { PrivyProvider, useCreateWallet, usePrivy, useWallets } from '@privy-io/react-auth';
import { getWasmOrThrow } from '@miden-sdk/miden-sdk';
import type { Signer } from '@openzeppelin/miden-multisig-client';
import { PRIVY_APP_ID, PRIVY_CLIENT_ID } from '@/config/psm';
import { formatError } from '@/lib/errors';
import { createPrivySigner } from '@/lib/privySigner';
import { EmailLogin } from './AuthGate';
import { SpikeEmailRecovery } from './SpikeEmailRecovery';

/**
 * Development spike (?spike=email-key): the email key for real. A Privy
 * email login, in the same Privy app as the Telegram login but as its own
 * user (never linked to Telegram), with its own embedded wallet. That wallet
 * replaces the local "email" stand-in in the 2-of-3 steps.
 *
 * Runs on its own origin (localhost:3007 here, a recovery subdomain later):
 * one origin holds one Privy session, so the Telegram login keeps its own.
 */
export function SpikeEmailKey() {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      clientId={PRIVY_CLIENT_ID}
      config={{
        loginMethods: ['email'],
        appearance: { theme: 'light', accentColor: '#ff6b1a', walletChainType: 'ethereum-only' },
        embeddedWallets: { ethereum: { createOnLogin: 'off' }, showWalletUIs: false },
      }}
    >
      <EmailKey />
    </PrivyProvider>
  );
}

function EmailKey() {
  const { ready, authenticated, user, logout } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const [signer, setSigner] = useState<Signer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const embedded = wallets.find((w) => w.walletClientType === 'privy' && w.type === 'ethereum');

  useEffect(() => {
    if (!embedded) return;
    let cancelled = false;
    (async () => {
      const [provider] = await Promise.all([embedded.getEthereumProvider(), getWasmOrThrow()]);
      const result = await createPrivySigner({ address: embedded.address, provider });
      if (!cancelled) setSigner(result.signer);
    })().catch((e: unknown) => { if (!cancelled) setError(formatError(e)); });
    return () => { cancelled = true; };
  }, [embedded]);

  if (!ready) return <main className="screen"><div className="sub">Loading Privy…</div></main>;
  if (!authenticated) {
    return (
      <main className="screen" style={{ display: 'grid', gap: 8 }}>
        <div className="page-title">Email key spike</div>
        <div className="sub">Sign in with a test email that is not linked to any Telegram account.</div>
        <EmailLogin label="Test email" />
      </main>
    );
  }
  const header = (
    <div className="sub fine selectable">
      Email user {user?.email?.address ?? '?'} · Privy {user?.id} · origin {window.location.origin}
      {' '}<button className="text-btn small" onClick={() => void logout()}>Log out</button>
    </div>
  );
  // The email key must be independent of the Telegram key: never the same Privy user.
  if (user?.telegram) {
    return <main className="screen">{header}<p className="error">This Privy user is linked to Telegram, so its key is the Telegram key. Use an email that isn’t linked to Telegram.</p></main>;
  }
  if (!embedded) {
    return (
      <main className="screen" style={{ display: 'grid', gap: 8 }}>
        {header}
        <button className="btn" onClick={() => createWallet().catch((e: unknown) => setError(formatError(e)))}>Create the email key (Privy wallet)</button>
        {error && <p className="error">{error}</p>}
      </main>
    );
  }
  if (error) return <main className="screen">{header}<p className="error">{error}</p></main>;
  if (!signer) return <main className="screen">{header}<div className="sub">Reading the email key…</div></main>;
  return (
    <>
      <main className="screen" style={{ paddingBottom: 0 }}>{header}<div className="sub fine selectable">Email key {signer.commitment}</div></main>
      <SpikeEmailRecovery overrides={{ email: signer }} account={`privy-${user?.id}`} title="2-of-3 with the real email key (testnet)" />
    </>
  );
}

/**
 * Development spike (?spike=side-by-side on :3006): two Privy sessions of the
 * same app at once. This page's own login stands in for the Telegram one; the
 * email key runs embedded from the other origin (as a recovery subdomain
 * would inside the mini app). Each must stay signed in, unaffected by the other.
 */
export function SpikeSideBySide() {
  const other = process.env.NEXT_PUBLIC_SPIKE_EMAIL_ORIGIN || 'http://localhost:3007';
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      clientId={PRIVY_CLIENT_ID}
      config={{
        loginMethods: ['email'],
        appearance: { theme: 'light', accentColor: '#ff6b1a', walletChainType: 'ethereum-only' },
        embeddedWallets: { ethereum: { createOnLogin: 'off' }, showWalletUIs: false },
      }}
    >
      <main className="screen" style={{ display: 'grid', gap: 12 }}>
        <div className="page-title">Two Privy sessions side by side</div>
        <ThisSession />
        <iframe
          title="Email key, other origin"
          src={`${other}/?spike=email-key`}
          style={{ width: '100%', height: 900, border: '0.5px solid var(--line)', borderRadius: 12 }}
        />
      </main>
    </PrivyProvider>
  );
}

function ThisSession() {
  const { ready, authenticated, user, logout } = usePrivy();
  if (!ready) return <div className="sub">This page’s Privy: loading…</div>;
  if (!authenticated) return <EmailLogin label="This page’s session (stand-in for the Telegram login)" />;
  return (
    <div className="sub selectable">
      This page’s session: {user?.email?.address} · Privy {user?.id} · {window.location.origin}
      {' '}<button className="text-btn small" onClick={() => void logout()}>Log out</button>
    </div>
  );
}

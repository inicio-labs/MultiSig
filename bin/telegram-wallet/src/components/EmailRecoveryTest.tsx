'use client';

import { useEffect, useRef, useState } from 'react';
import { PrivyProvider, useCreateWallet, usePrivy, useWallets } from '@privy-io/react-auth';
import { getWasmOrThrow } from '@miden-sdk/miden-sdk';
import type { Signer } from '@openzeppelin/miden-multisig-client';
import type { Hex } from 'viem';
import { PRIVY_APP_ID, PRIVY_CLIENT_ID } from '@/config/psm';
import { formatError } from '@/lib/errors';
import { createPrivySigner, type RawHashProvider } from '@/lib/privySigner';
import { storage } from '@/lib/storage';
import { insideTelegram } from '@/lib/telegram';
import { EmailLogin } from './AuthGate';
import { SpikeEmailRecovery } from './SpikeEmailRecovery';

/**
 * A hidden test of email recovery on the live site, as a real user:
 *
 * - `privpay.forkchoice.xyz/?test=email-recovery`, opened in Telegram: the
 *   real Telegram key (Privy's seamless Telegram login), with
 * - `privpay-recover.forkchoice.xyz/?test=email-key` embedded: a Privy email
 *   login on its own origin (one origin holds one Privy session), holding the
 *   email key and signing only what this page asks.
 *
 * Together with a test phone key kept in this page they run the 2-of-3 steps
 * on a separate throwaway testnet account; the real wallet is never touched.
 */
export function emailRecoveryTest(): 'parent' | 'frame' | null {
  const test = new URLSearchParams(window.location.search).get('test');
  return test === 'email-recovery' ? 'parent' : test === 'email-key' ? 'frame' : null;
}

const APP_ORIGIN = process.env.NEXT_PUBLIC_TEST_APP_ORIGIN || 'https://privpay.forkchoice.xyz';
const RECOVER_ORIGIN = process.env.NEXT_PUBLIC_TEST_RECOVER_ORIGIN || 'https://privpay-recover.forkchoice.xyz';
// Same cache as AuthGate: the wallet's public key is public data.
const PUBLIC_KEY_CACHE = 'miden-tg-wallet:pubkey:';

type FrameMessage =
  | { type: 'email-key'; address: string; publicKey: Hex; email: string | null }
  | { type: 'signed'; id: number; signature?: string; error?: string };

// ---------------------------------------------------------------- parent ---

export function EmailRecoveryTest() {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      clientId={PRIVY_CLIENT_ID}
      config={{
        loginMethods: ['telegram'],
        appearance: { theme: 'light', accentColor: '#ff6b1a', walletChainType: 'ethereum-only' },
        embeddedWallets: { ethereum: { createOnLogin: 'off' }, showWalletUIs: false },
      }}
    >
      <Parent />
    </PrivyProvider>
  );
}

function Parent() {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const [telegramKey, setTelegramKey] = useState<Signer | null>(null);
  const [emailKey, setEmailKey] = useState<{ signer: Signer; email: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const pending = useRef(new Map<number, { resolve(sig: string): void; reject(e: Error): void }>());
  const nextId = useRef(1);
  const embedded = wallets.find((w) => w.walletClientType === 'privy' && w.type === 'ethereum');

  // The real Telegram key, as the app builds it.
  useEffect(() => {
    if (!embedded) return;
    let cancelled = false;
    (async () => {
      const [provider] = await Promise.all([embedded.getEthereumProvider(), getWasmOrThrow()]);
      const cacheKey = PUBLIC_KEY_CACHE + embedded.address.toLowerCase();
      const cached = storage.get(cacheKey) as Hex | null;
      const result = await createPrivySigner({ address: embedded.address, provider, publicKey: cached ?? undefined });
      storage.set(cacheKey, result.publicKey);
      if (!cancelled) setTelegramKey(result.signer);
    })().catch((e: unknown) => { if (!cancelled) setError(`Telegram key: ${formatError(e)}`); });
    return () => { cancelled = true; };
  }, [embedded]);

  // The email key lives in the embedded page; each signature is asked of it.
  useEffect(() => {
    const onMessage = (event: MessageEvent<FrameMessage>) => {
      if (event.origin !== RECOVER_ORIGIN || event.source !== frame.current?.contentWindow) return;
      const message = event.data;
      if (message?.type === 'email-key') {
        const provider: RawHashProvider = {
          request: ({ params }) => new Promise((resolve, reject) => {
            const id = nextId.current++;
            pending.current.set(id, { resolve, reject });
            frame.current?.contentWindow?.postMessage({ type: 'sign', id, hash: (params as [Hex])[0] }, RECOVER_ORIGIN);
            setTimeout(() => {
              if (pending.current.delete(id)) reject(new Error('The email key did not answer.'));
            }, 120_000);
          }),
        };
        void getWasmOrThrow()
          .then(() => createPrivySigner({ address: message.address, publicKey: message.publicKey, provider }))
          .then((result) => setEmailKey({ signer: result.signer, email: message.email }))
          .catch((e: unknown) => setError(`Email key: ${formatError(e)}`));
      } else if (message?.type === 'signed') {
        const waiter = pending.current.get(message.id);
        if (!waiter) return;
        pending.current.delete(message.id);
        if (message.signature) waiter.resolve(message.signature);
        else waiter.reject(new Error(message.error ?? 'The email key refused.'));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (!insideTelegram) {
    return <main className="screen"><div className="page-title">Email recovery test</div><div className="sub">Open this page from the PrivPay bot in Telegram: it uses your real Telegram login.</div></main>;
  }
  return (
    <main className="screen" style={{ display: 'grid', gap: 10 }}>
      <div className="page-title">Email recovery test (testnet)</div>
      <div className="sub fine">A separate test account. Your real wallet isn’t touched.</div>
      <Status ok={Boolean(telegramKey)} label="Telegram key" detail={telegramKey ? `${user?.telegram?.username ? `@${user.telegram.username}` : 'your Telegram'} · ${telegramKey.commitment.slice(0, 12)}…` : !ready || !authenticated ? 'Signing in with Telegram…' : 'Reading your key…'} />
      <Status ok={Boolean(emailKey)} label="Email key" detail={emailKey ? `${emailKey.email ?? 'email'} · ${emailKey.signer.commitment.slice(0, 12)}…` : 'Sign in below with your email'} />
      {error && <p className="error">{error}</p>}
      <iframe
        ref={frame}
        title="Recovery email"
        src={`${RECOVER_ORIGIN}/?test=email-key`}
        style={{ width: '100%', height: emailKey ? 70 : 230, border: '0.5px solid var(--line)', borderRadius: 12, background: 'var(--surface)' }}
      />
      {telegramKey && emailKey && (
        <SpikeEmailRecovery
          overrides={{ telegram: telegramKey, email: emailKey.signer }}
          account={`live-${telegramKey.commitment.slice(2, 14)}`}
          title="Steps"
        />
      )}
    </main>
  );
}

function Status({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="cell">
      <span className="cell-main">
        <span className="cell-title">{ok ? '✓ ' : ''}{label}</span>
        <span className="cell-sub wrap selectable">{detail}</span>
      </span>
    </div>
  );
}

// ----------------------------------------------------------------- frame ---

export function EmailKeyFrame() {
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
      <Frame />
    </PrivyProvider>
  );
}

function Frame() {
  const { ready, authenticated, user, logout } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const [signed, setSigned] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const embedded = wallets.find((w) => w.walletClientType === 'privy' && w.type === 'ethereum');
  const framed = window.parent !== window;

  // Announce the email key to the PrivPay page, then sign what it asks.
  useEffect(() => {
    if (!embedded || !framed || user?.telegram) return;
    let cancelled = false;
    let provider: RawHashProvider | null = null;
    const onMessage = (event: MessageEvent<{ type: string; id: number; hash: Hex }>) => {
      if (event.origin !== APP_ORIGIN || event.source !== window.parent || event.data?.type !== 'sign' || !provider) return;
      const { id, hash } = event.data;
      if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) return;
      provider.request({ method: 'secp256k1_sign', params: [hash] }).then(
        (signature) => {
          setSigned((n) => n + 1);
          window.parent.postMessage({ type: 'signed', id, signature }, APP_ORIGIN);
        },
        (e: unknown) => window.parent.postMessage({ type: 'signed', id, error: formatError(e) }, APP_ORIGIN),
      );
    };
    window.addEventListener('message', onMessage);
    (async () => {
      const [p] = await Promise.all([embedded.getEthereumProvider(), getWasmOrThrow()]);
      provider = p;
      const result = await createPrivySigner({ address: embedded.address, provider: p });
      if (cancelled) return;
      window.parent.postMessage({ type: 'email-key', address: embedded.address, publicKey: result.publicKey, email: user?.email?.address ?? null }, APP_ORIGIN);
    })().catch((e: unknown) => { if (!cancelled) setError(formatError(e)); });
    return () => {
      cancelled = true;
      window.removeEventListener('message', onMessage);
    };
  }, [embedded, framed, user]);

  if (!framed) return <main className="screen"><div className="sub">This page only works inside the PrivPay email recovery test.</div></main>;
  if (!ready) return <main className="screen"><div className="sub">Loading…</div></main>;
  if (!authenticated) return <main className="screen" style={{ paddingTop: 8 }}><EmailLogin label="Your recovery email" /></main>;
  if (user?.telegram) {
    return (
      <main className="screen">
        <p className="error">This email belongs to your Telegram login, so it would be the same key. Use another email.</p>
        <button className="text-btn" onClick={() => void logout()}>Use another email</button>
      </main>
    );
  }
  if (!embedded) {
    return (
      <main className="screen" style={{ paddingTop: 8 }}>
        <div className="sub">Signed in as {user?.email?.address}.</div>
        <button className="btn" onClick={() => createWallet().catch((e: unknown) => setError(formatError(e)))}>Create my email key</button>
        {error && <p className="error">{error}</p>}
      </main>
    );
  }
  return (
    <main className="screen" style={{ paddingTop: 8 }}>
      <div className="sub fine">Email key ready ({user?.email?.address}) · signatures given: {signed}</div>
      {error && <p className="error">{error}</p>}
    </main>
  );
}

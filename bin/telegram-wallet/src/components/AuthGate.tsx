'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useCreateWallet, useLoginWithEmail, useLoginWithOAuth, usePrivy, useWallets } from '@privy-io/react-auth';
import { getWasmOrThrow } from '@miden-sdk/miden-sdk';
import type { Signer } from '@openzeppelin/miden-multisig-client';
import type { Hex } from 'viem';
import { formatError } from '@/lib/errors';
import { createPrivySigner } from '@/lib/privySigner';
import { storage } from '@/lib/storage';
import { insideTelegram, prepareTelegramRetry } from '@/lib/telegram';
import { Fatal, Splash } from './Splash';

/** Local testing outside Telegram: email login (it must be enabled in Privy too). */
export const DEV_EMAIL_LOGIN = process.env.NEXT_PUBLIC_DEV_EMAIL_LOGIN === '1';

// The wallet's public key, per address: public data, cached to skip the
// key-discovery signature on every launch.
const PUBLIC_KEY_CACHE = 'miden-tg-wallet:pubkey:';
// Privy logs in from Telegram's launch data on its own; past this, offer a retry.
const SEAMLESS_LOGIN_TIMEOUT_MS = 15_000;

/**
 * Logged in with Privy (silently, from Telegram's launch data, inside
 * Telegram), with an embedded wallet, and that wallet as a multisig signer.
 */
export function AuthGate({ onRetry, children }: { onRetry(): void; children(signer: Signer): ReactNode }) {
  const { ready, authenticated, user } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const [error, setError] = useState<string | null>(null);
  const [loginStalled, setLoginStalled] = useState(false);
  const [signer, setSigner] = useState<{ address: string; signer: Signer } | null>(null);
  const creatingFor = useRef<string | null>(null);

  const embedded = wallets.find((w) => w.walletClientType === 'privy' && w.type === 'ethereum');
  const embeddedRef = useRef(embedded);
  embeddedRef.current = embedded;
  // A wallet already linked to the user but not connected yet: never create a second one.
  const linked = Boolean(user?.linkedAccounts.some(
    (a) => a.type === 'wallet' && a.walletClientType === 'privy' && a.chainType === 'ethereum',
  ));

  useEffect(() => {
    if (!insideTelegram || authenticated) return;
    const timer = setTimeout(() => setLoginStalled(true), SEAMLESS_LOGIN_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [authenticated]);

  useEffect(() => {
    if (!ready || !authenticated || !user || !walletsReady || embedded || linked || creatingFor.current === user.id) return;
    creatingFor.current = user.id;
    createWallet().catch((e: unknown) => setError(`Could not create your wallet: ${formatError(e)}`));
  }, [ready, authenticated, user, walletsReady, embedded, linked, createWallet]);

  const address = embedded?.address;
  useEffect(() => {
    const wallet = embeddedRef.current;
    if (!wallet) return;
    let cancelled = false;
    (async () => {
      const [provider] = await Promise.all([wallet.getEthereumProvider(), getWasmOrThrow()]);
      const cacheKey = PUBLIC_KEY_CACHE + wallet.address.toLowerCase();
      const cached = storage.get(cacheKey) as Hex | null;
      const result = await createPrivySigner({ address: wallet.address, provider, publicKey: cached ?? undefined })
        .catch((e: unknown) => {
          if (!cached) throw e;
          storage.remove(cacheKey);
          return createPrivySigner({ address: wallet.address, provider });
        });
      storage.set(cacheKey, result.publicKey);
      if (!cancelled) setSigner({ address: wallet.address, signer: result.signer });
    })().catch((e: unknown) => {
      if (!cancelled) setError(`Could not use your wallet key: ${formatError(e)}`);
    });
    return () => { cancelled = true; };
  }, [address]);

  const retry = () => {
    if (insideTelegram) {
      const expired = prepareTelegramRetry();
      if (expired) {
        setError(expired);
        return;
      }
    }
    setError(null);
    setLoginStalled(false);
    onRetry();
  };

  if (!ready) return <Splash />;
  if (error) return <Fatal title="Something went wrong" message={error} action={{ label: 'Try again', run: retry }} />;
  if (!authenticated) {
    if (insideTelegram && !loginStalled) return <Splash label="Signing you in with Telegram…" />;
    return <LoginScreen onRetry={retry} />;
  }
  if (!signer || signer.address !== address) return <Splash label="Preparing your wallet…" />;
  return <>{children(signer.signer)}</>;
}

function LoginScreen({ onRetry }: { onRetry(): void }) {
  const { initOAuth, loading } = useLoginWithOAuth();
  const [error, setError] = useState<string | null>(null);

  if (insideTelegram) {
    return <Fatal title="Could not sign you in" message="Telegram did not complete the sign-in." action={{ label: 'Try again', run: onRetry }} />;
  }
  return (
    <main className="screen">
      <div className="center">
        <h1 className="title">Miden Wallet</h1>
        <p className="hint">Open this wallet from its Telegram bot, or sign in with Telegram here.</p>
        <button
          className="btn"
          style={{ maxWidth: 300 }}
          disabled={loading}
          // initOAuth, not the generic login: with both bot and OIDC credentials
          // configured, Privy's generic Telegram login picks the deprecated widget.
          onClick={() => initOAuth({ provider: 'telegram' }).catch((e: unknown) => setError(formatError(e)))}
        >
          Continue with Telegram
        </button>
        {DEV_EMAIL_LOGIN && <EmailLogin />}
        {error && <p className="error">{error}</p>}
      </div>
    </main>
  );
}

function EmailLogin() {
  const { sendCode, loginWithCode, state } = useLoginWithEmail();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const codeSent = state.status === 'awaiting-code-input' || state.status === 'submitting-code';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const run = codeSent ? loginWithCode({ code: code.trim() }) : sendCode({ email: email.trim() });
    run.catch((e: unknown) => setError(formatError(e)));
  };

  return (
    <form onSubmit={submit} style={{ width: '100%', maxWidth: 300, display: 'grid', gap: 8, marginTop: 16 }}>
      <p className="hint">Development: email login</p>
      {codeSent ? (
        <input className="input" inputMode="numeric" placeholder="Code from the email" value={code} onChange={(e) => setCode(e.target.value)} />
      ) : (
        <input className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      )}
      <button className="btn secondary" type="submit">{codeSent ? 'Log in' : 'Send code'}</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

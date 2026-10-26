'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PrivyProvider, useCreateWallet, useLoginWithEmail, usePrivy, useWallets } from '@privy-io/react-auth';
import { getWasmOrThrow } from '@miden-sdk/miden-sdk';
import type { Hex } from 'viem';
import { generatePrivateKey, privateKeyToAccount, privateKeyToAddress, sign } from 'viem/accounts';
import { PRIVY_APP_ID, PRIVY_CLIENT_ID } from '@/config/psm';
import { formatError } from '@/lib/errors';
import { createPrivySigner } from '@/lib/privySigner';
import {
  isSixDigits,
  looksLikeEmail,
  walletOrigin,
  type BoxMessage,
  type EmailBoxState,
  type EmailBoxStep,
  type WalletMessage,
} from '@/lib/recoveryFrame';
import { storage } from '@/lib/storage';

/**
 * The recovery email box (recoveryFrame.ts): runs on the recovery origin,
 * embedded in the wallet, and draws only the field. Behind it, an email-only
 * Privy user (never linked to Telegram) whose embedded wallet is the
 * recovery email key; development builds use a local key instead.
 */

interface EmailKey {
  address: string;
  publicKey: Hex;
  email: string;
  sign(hash: Hex): Promise<string>;
}

interface Backend {
  loaded: boolean;
  signedIn: boolean;
  /** The email user is the Telegram login's own (its key would be the Telegram key). */
  linkedToTelegram: boolean;
  key: EmailKey | null;
  sendCode(email: string): Promise<void>;
  /** Throws CodeLost when this page no longer holds the code it sent (reloaded). */
  verify(code: string): Promise<void>;
  signOut(): Promise<void>;
}

class CodeLost extends Error {}

// The email the code went to, kept on this origin: a reload lands on the code step.
const SENT_TO = 'privpay-recovery:code-sent-to';

export function RecoveryEmailBox({ mode }: { mode: 'privy' | 'dev' }) {
  useLayoutEffect(() => {
    document.documentElement.classList.add('email-box-page');
  }, []);
  if (mode === 'dev') return <DevBox />;
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
      <PrivyBox />
    </PrivyProvider>
  );
}

function PrivyBox() {
  const { ready, authenticated, user, logout } = usePrivy();
  const { sendCode, loginWithCode, state } = useLoginWithEmail();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const [key, setKey] = useState<EmailKey | null>(null);
  const creating = useRef(false);
  const embedded = wallets.find((w) => w.walletClientType === 'privy' && w.type === 'ethereum');
  const linkedToTelegram = Boolean(user?.telegram);

  // Signed in without the key yet: make it (once).
  useEffect(() => {
    if (!authenticated || embedded || linkedToTelegram || creating.current) return;
    creating.current = true;
    createWallet().catch((e: unknown) => console.warn('Could not create the email key', e)).finally(() => { creating.current = false; });
  }, [authenticated, embedded, linkedToTelegram, createWallet]);

  useEffect(() => {
    if (!embedded || linkedToTelegram) return;
    let cancelled = false;
    (async () => {
      const [provider] = await Promise.all([embedded.getEthereumProvider(), getWasmOrThrow()]);
      const { publicKey } = await createPrivySigner({ address: embedded.address, provider });
      if (cancelled) return;
      setKey({
        address: embedded.address,
        publicKey,
        email: user?.email?.address ?? '',
        sign: (hash) => provider.request({ method: 'secp256k1_sign', params: [hash] }) as Promise<string>,
      });
    })().catch((e: unknown) => console.warn('Could not read the email key', e));
    return () => { cancelled = true; };
  }, [embedded, linkedToTelegram, user?.email?.address]);

  const codeInFlight = state.status === 'awaiting-code-input' || state.status === 'submitting-code' || state.status === 'error';
  const backend: Backend = {
    loaded: ready,
    signedIn: authenticated,
    linkedToTelegram,
    key,
    sendCode: (email) => sendCode({ email }),
    verify: async (code) => {
      if (!codeInFlight) throw new CodeLost();
      await loginWithCode({ code });
    },
    signOut: async () => {
      setKey(null);
      await logout();
    },
  };
  return <Box backend={backend} />;
}

// Development stand-in: a local key, any 6-digit code. Same key as window.recoveryDev.
const DEV_KEY = 'miden-tg-wallet:dev-email-key';
const DEV_SESSION = 'privpay-recovery:dev-session';

function DevBox() {
  const [session, setSession] = useState<string | null>(() => storage.get(DEV_SESSION));
  const [inFlight, setInFlight] = useState(false);
  const [key, setKey] = useState<EmailKey | null>(null);
  useEffect(() => {
    if (!session) {
      setKey(null);
      return;
    }
    // One stand-in key per email, as Privy gives one wallet per email user.
    const keyName = `${DEV_KEY}:${session.toLowerCase()}`;
    let privateKey = storage.get(keyName) as Hex | null;
    if (!privateKey) {
      privateKey = generatePrivateKey();
      storage.set(keyName, privateKey);
    }
    const pk = privateKey;
    setKey({
      address: privateKeyToAddress(pk),
      publicKey: privateKeyToAccount(pk).publicKey,
      email: session,
      sign: (hash) => sign({ hash, privateKey: pk, to: 'hex' }),
    });
  }, [session]);
  const backend: Backend = {
    loaded: true,
    signedIn: Boolean(session),
    linkedToTelegram: false,
    key,
    sendCode: async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setInFlight(true);
    },
    verify: async (code) => {
      if (!inFlight) throw new CodeLost();
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (code === '000000') throw new Error('Invalid code');
      const email = storage.get(SENT_TO) ?? 'dev@example.com';
      storage.set(DEV_SESSION, email);
      setSession(email);
    },
    signOut: async () => {
      storage.remove(DEV_SESSION);
      setSession(null);
    },
  };
  return <Box backend={backend} />;
}

function codeError(error: unknown): { text: string; resend?: boolean } {
  const message = formatError(error).toLowerCase();
  if (/expired/.test(message)) return { text: 'That code has expired. We’ve sent a new one.', resend: true };
  if (/too many|attempt|rate/.test(message)) return { text: 'Too many tries. Wait a minute, then resend.' };
  return { text: 'That code didn’t work. Check the latest email.' };
}

function Box({ backend }: { backend: Backend }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(() => storage.get(SENT_TO));
  // A reload since the code was sent: Privy no longer holds it.
  const [stale, setStale] = useState(() => Boolean(storage.get(SENT_TO)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [height, setHeight] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const announced = useRef<string | null>(null);
  const target = walletOrigin();

  const step: EmailBoxStep = !backend.loaded
    ? 'loading'
    : backend.key
      ? 'ready'
      : backend.signedIn && !backend.linkedToTelegram
        ? 'creating'
        : sentTo
          ? 'code'
          : 'email';
  const valid = step === 'email' ? looksLikeEmail(email) : step === 'code' ? isSixDigits(code) : step === 'ready';
  const post = useCallback((message: BoxMessage) => window.parent.postMessage(message, target), [target]);

  // The Telegram login's own email user: its key would be the Telegram key.
  useEffect(() => {
    if (!backend.linkedToTelegram) return;
    setError('This email is already linked to your Telegram login. Use another one.');
    storage.remove(SENT_TO);
    setSentTo(null);
    void backend.signOut();
  }, [backend.linkedToTelegram]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (backend.key) storage.remove(SENT_TO);
  }, [backend.key]);

  const send = useCallback(async (to: string) => {
    setBusy(true);
    setError(null);
    try {
      await backend.sendCode(to);
      storage.set(SENT_TO, to);
      setSentTo(to);
      setStale(false);
      setCode('');
    } catch {
      setError('Couldn’t send the code. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }, [backend]);

  const verify = useCallback(async (value: string) => {
    setBusy(true);
    setError(null);
    try {
      await backend.verify(value);
    } catch (e) {
      setCode('');
      if (e instanceof CodeLost && sentTo) {
        setError('That code has expired. We’ve sent a new one.');
        setBusy(false);
        await send(sentTo);
        setError('That code has expired. We’ve sent a new one.');
        return;
      }
      const { text, resend } = codeError(e);
      setError(text);
      if (resend && sentTo) void send(sentTo).then(() => setError(text));
    } finally {
      setBusy(false);
    }
  }, [backend, send, sentTo]);

  const submit = useCallback(() => {
    if (busy) return;
    if (step === 'email') {
      if (!looksLikeEmail(email)) return setError('That doesn’t look like an email.');
      void send(email.trim());
    } else if (step === 'code' && isSixDigits(code)) {
      void verify(code);
    }
  }, [busy, step, email, code, send, verify]);

  // The wallet's sheet drives the box.
  useEffect(() => {
    const onMessage = (event: MessageEvent<WalletMessage>) => {
      if (event.origin !== target || event.source !== window.parent) return;
      const message = event.data;
      if (message?.type === 'submit') submit();
      else if (message?.type === 'send-to' && looksLikeEmail(message.email ?? '')) {
        // Already signed in, or the code already went there: nothing to send.
        if (!backend.signedIn && sentTo !== message.email) {
          setEmail(message.email);
          void send(message.email);
        }
      }
      else if (message?.type === 'resend' && sentTo) void send(sentTo);
      else if (message?.type === 'change') {
        storage.remove(SENT_TO);
        setSentTo(null);
        setCode('');
        setError(null);
        if (backend.signedIn) void backend.signOut();
      } else if (message?.type === 'sign' && /^0x[0-9a-fA-F]{64}$/.test(message.hash ?? '')) {
        const { id, hash } = message;
        if (!backend.key) return post({ type: 'signed', id, error: 'The recovery email is not signed in.' });
        backend.key.sign(hash).then(
          (signature) => post({ type: 'signed', id, signature }),
          (e: unknown) => post({ type: 'signed', id, error: formatError(e) }),
        );
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [target, submit, send, sentTo, backend, post]);

  // What the field shows, for the sheet around it.
  useEffect(() => {
    const state: EmailBoxState = { step, valid, busy, error, email: backend.key?.email || sentTo, stale, height };
    post({ type: 'state', ...state });
  }, [step, valid, busy, error, sentTo, stale, height, backend.key, post]);

  useEffect(() => {
    const key = backend.key;
    if (!key || announced.current === key.publicKey) return;
    announced.current = key.publicKey;
    post({ type: 'email-key', address: key.address, publicKey: key.publicKey, email: key.email || sentTo || '' });
  }, [backend.key, sentTo, post]);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setHeight(Math.ceil(element.getBoundingClientRect().height)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={root} className="email-box">
      {step === 'loading' || step === 'creating' ? (
        <div className="email-box-skeleton" aria-hidden />
      ) : step === 'email' ? (
        <input
          className="field"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
          placeholder="you@example.com"
          aria-label="Recovery email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          disabled={busy}
        />
      ) : step === 'code' ? (
        <label className="code-boxes" onClick={() => codeInput.current?.focus()}>
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className={`code-box${i === code.length ? ' is-next' : ''}`}>{code[i] ?? ''}</span>
          ))}
          <input
            ref={codeInput}
            className="code-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d*"
            maxLength={6}
            aria-label="6-digit code"
            value={code}
            disabled={busy}
            onChange={(e) => {
              const next = e.target.value.replace(/\D/g, '').slice(0, 6);
              setCode(next);
              setError(null);
              // Submits by itself on the 6th digit.
              if (next.length === 6) void verify(next);
            }}
          />
        </label>
      ) : null}
    </div>
  );
}

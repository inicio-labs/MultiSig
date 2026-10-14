'use client';

import { useEffect, useRef, useState } from 'react';
import { onDesktop, telegramStartParam } from '@/lib/telegram';

/**
 * A test page, opened only from t.me/<bot>?startapp=passkey_check: can this
 * Telegram (its built-in browser) use passkeys for this site? That decides
 * whether Privy's passkey check (Face ID for wallet signatures) can work in
 * the mini app. Plain WebAuthn, nothing sent anywhere, the wallet untouched;
 * a successful create saves a "PrivPay passkey test" passkey on the phone.
 */
export const isPasskeyCheck = (): boolean => telegramStartParam() === 'passkey_check';

type Line = { step: string; result: string };

const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));
const describe = (error: unknown) =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);

export function PasskeyCheck() {
  const [lines, setLines] = useState<Line[]>([]);
  const [credential, setCredential] = useState<ArrayBuffer | null>(null);
  const [copied, setCopied] = useState(false);
  const add = (step: string, result: string) => setLines((all) => [...all, { step, result }]);

  const ran = useRef(false);
  useEffect(() => {
    // Once, even where React runs effects twice (development).
    if (ran.current) return;
    ran.current = true;
    const app = (window as { Telegram?: { WebApp?: { platform?: string; version?: string } } }).Telegram?.WebApp;
    add('Where', `${app?.platform ?? 'not Telegram'} · Telegram ${app?.version ?? '?'} · ${onDesktop() ? 'desktop' : 'phone'}`);
    add('Browser', navigator.userAgent);
    add('Site', location.hostname);
    if (typeof PublicKeyCredential === 'undefined') {
      add('Passkeys in this browser', 'NO (PublicKeyCredential missing)');
      return;
    }
    add('Passkeys in this browser', 'yes (PublicKeyCredential present)');
    void PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.()
      .then((available) => add('Face ID / fingerprint for passkeys', available ? 'yes' : 'NO'))
      .catch((error: unknown) => add('Face ID / fingerprint for passkeys', `error ${describe(error)}`));
  }, []);

  const create = async () => {
    try {
      const made = await navigator.credentials.create({
        publicKey: {
          rp: { name: 'PrivPay', id: location.hostname },
          user: { id: random(16), name: 'privpay-passkey-test', displayName: 'PrivPay passkey test' },
          challenge: random(32),
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
          authenticatorSelection: { authenticatorAttachment: 'platform', residentKey: 'preferred', userVerification: 'required' },
          timeout: 60_000,
        },
      }) as PublicKeyCredential | null;
      if (!made) return add('Create test passkey', 'NO (nothing returned)');
      setCredential(made.rawId);
      add('Create test passkey', `OK (${(made as PublicKeyCredential & { authenticatorAttachment?: string }).authenticatorAttachment ?? 'platform'})`);
    } catch (error) {
      add('Create test passkey', `FAILED ${describe(error)}`);
    }
  };

  const use = async () => {
    try {
      const got = await navigator.credentials.get({
        publicKey: {
          challenge: random(32),
          rpId: location.hostname,
          allowCredentials: credential ? [{ type: 'public-key', id: credential }] : [],
          userVerification: 'required',
          timeout: 60_000,
        },
      });
      add('Use the passkey', got ? 'OK (signed with Face ID / fingerprint)' : 'NO (nothing returned)');
    } catch (error) {
      add('Use the passkey', `FAILED ${describe(error)}`);
    }
  };

  const copy = () => {
    const text = lines.map((l) => `${l.step}: ${l.result}`).join('\n');
    void navigator.clipboard.writeText(text).then(() => setCopied(true), () => setCopied(false));
  };

  return (
    <main className="screen">
      <div className="page-title">Passkey check</div>
      <div className="sub fine">Tests whether passkeys (Face ID) work in this Telegram. Nothing is sent anywhere and your wallet is untouched. A successful test saves a “PrivPay passkey test” passkey on this phone; you can delete it in your passwords settings.</div>
      <div className="cells">
        {lines.map((line, i) => (
          <div key={i} className="cell">
            <span className="cell-main">
              <span className="cell-title">{line.step}</span>
              <span className="cell-sub wrap selectable">{line.result}</span>
            </span>
          </div>
        ))}
      </div>
      <button className="btn" onClick={() => void create()}>1. Create test passkey</button>
      <button className="btn soft" onClick={() => void use()} disabled={!credential}>2. Use it</button>
      <button className="btn ink" onClick={copy}>{copied ? 'Copied' : 'Copy results'}</button>
    </main>
  );
}

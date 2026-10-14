'use client';

import { useEffect, useRef, useState } from 'react';
import { insideTelegram, onDesktop, openLinkInBrowser, telegramStartParam } from '@/lib/telegram';
import { browserKind, OPEN_LINK_VARIANTS, passkeyCheckRequested, passkeyCheckUrl, resultsText } from '@/lib/testPages';

/**
 * A test page, opened only from t.me/<bot>?startapp=passkey_check (or
 * ?passkey_check=1 in any browser): can this browser use passkeys for this
 * site? That decides whether Privy's passkey check (Face ID for wallet
 * signatures) can work. Plain WebAuthn, nothing sent anywhere, the wallet
 * untouched; a successful create saves a "PrivPay passkey test" passkey on
 * the phone. Inside Telegram it can also ask Telegram to open this page in a
 * real browser (openLink), to see whether passkeys work there.
 */
const FLAG = 'privpay-passkey-check';

/** From the test link, `?passkey_check=1`, or Settings (which reloads the app into this page). */
export function isPasskeyCheck(): boolean {
  let flag = false;
  try { flag = window.sessionStorage.getItem(FLAG) === '1'; } catch { /* no storage: link only */ }
  return passkeyCheckRequested({ startParam: telegramStartParam(), search: window.location.search, flag });
}

/** Settings › Passkey check: reload into the test page. */
export function openPasskeyCheck(): void {
  try { window.sessionStorage.setItem(FLAG, '1'); } catch { /* the link still works */ }
  window.location.reload();
}

function backToWallet(): void {
  try { window.sessionStorage.removeItem(FLAG); } catch { /* nothing to clear */ }
  // Opened as ?passkey_check=1: drop it, or the reload comes straight back here.
  if (new URLSearchParams(window.location.search).has('passkey_check')) window.location.replace(window.location.pathname);
  else window.location.reload();
}

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
    const app = (window as { Telegram?: { WebApp?: { platform?: string; version?: string; initData?: string } } }).Telegram?.WebApp;
    add('Where', `${app?.platform ?? 'not Telegram'} · Telegram ${app?.version ?? '?'} · ${onDesktop() ? 'desktop' : 'phone'}`);
    add('Which browser', browserKind({
      userAgent: navigator.userAgent,
      initData: app?.initData ?? '',
      telegramBridge: 'TelegramWebviewProxy' in window,
    }));
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
    void navigator.clipboard.writeText(resultsText(lines)).then(() => setCopied(true), () => setCopied(false));
  };

  // Test 3: can Telegram open this page in a real browser, where passkeys may work?
  const url = passkeyCheckUrl(window.location.origin);
  const openOutside = (variant: (typeof OPEN_LINK_VARIANTS)[number]) => {
    add(`Open in browser: ${variant.label}`, openLinkInBrowser(url, variant.options, variant.minVersion));
  };
  const copyLink = () => {
    void navigator.clipboard.writeText(url).then(
      () => add('Copy link', `copied ${url}: paste it into Safari`),
      (error: unknown) => add('Copy link', `FAILED ${describe(error)}`),
    );
  };

  return (
    <main className="screen">
      <div className="page-title">Passkey check</div>
      <div className="sub fine">Tests whether passkeys (Face ID) work in this browser (Telegram or not). Nothing is sent anywhere and your wallet is untouched. A successful test saves a “PrivPay passkey test” passkey on this phone; you can delete it in your passwords settings.</div>
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
      {insideTelegram && (
        <>
          <div className="sub fine">Open this check outside Telegram, then run “Create” there: does that browser allow passkeys?</div>
          {OPEN_LINK_VARIANTS.map((variant) => (
            <button key={variant.label} className="btn soft" onClick={() => openOutside(variant)}>{variant.label}</button>
          ))}
          <button className="btn soft" onClick={copyLink}>Copy link (paste into Safari)</button>
        </>
      )}
      <button className="btn ink" onClick={copy}>{copied ? 'Copied' : 'Copy results'}</button>
      <button className="text-btn" onClick={backToWallet}>Back to wallet</button>
    </main>
  );
}

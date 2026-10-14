'use client';

import { useEffect, useRef, useState } from 'react';
import {
  PrivyProvider,
  useCreateWallet,
  useLinkWithPasskey,
  useMfa,
  useMfaEnrollment,
  usePrivy,
  useRegisterMfaListener,
  useUser,
  useWallets,
  type MfaMethod,
  type User,
} from '@privy-io/react-auth';
import { keccak256, recoverAddress, type Hex } from 'viem';
import { PRIVY_APP_ID, PRIVY_CLIENT_ID } from '@/config/psm';
import { insideTelegram } from '@/lib/telegram';
import { privyPasskeyTestRequested, refuseEnrollReason, resultsText, type TestAccountView } from '@/lib/testPages';
import { EmailLogin } from './AuthGate';

/**
 * A hidden test page, opened only with ?privy_passkey_test=1 in a real
 * browser (Safari): does Privy's passkey MFA work for this site, and how
 * often does it prompt when the embedded wallet signs? It only ever works on
 * a throwaway Privy account signed in by email, and refuses any account
 * linked to Telegram (a real wallet user: a passkey requirement would lock
 * that wallet inside Telegram, where passkeys are blocked).
 */
export function isPrivyPasskeyTest(): boolean {
  return privyPasskeyTestRequested(window.location.search);
}

type Line = { step: string; result: string };

const describe = (error: unknown) =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);

export function PrivyPasskeyTest() {
  if (insideTelegram) {
    return (
      <main className="screen">
        <div className="page-title">Privy passkey test</div>
        <div className="sub">This test runs only in Safari, never inside Telegram (it would see your real wallet account). Open {window.location.origin}/?privy_passkey_test=1 in Safari.</div>
      </main>
    );
  }
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      clientId={PRIVY_CLIENT_ID}
      config={{
        loginMethods: ['email'],
        appearance: { theme: 'light', accentColor: '#ff6b1a', walletChainType: 'ethereum-only' },
        embeddedWallets: { ethereum: { createOnLogin: 'off' }, showWalletUIs: false },
        // This page shows its own MFA prompt, so the results show exactly when Privy asks.
        mfa: { noPromptOnMfaRequired: true },
      }}
    >
      <TestBody />
    </PrivyProvider>
  );
}

function accountView(user: User | null): TestAccountView | null {
  if (!user) return null;
  return { email: user.email?.address ?? null, linkedTypes: user.linkedAccounts.map((a) => a.type) };
}

function embeddedAccount(user: User | null) {
  return user?.linkedAccounts.find(
    (a) => a.type === 'wallet' && a.walletClientType === 'privy' && a.chainType === 'ethereum',
  ) as { address: string; recoveryMethod?: string } | undefined;
}

function TestBody() {
  const { ready, authenticated, user, logout, mfaMethods: appMfaMethods } = usePrivy();
  const { refreshUser } = useUser();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const { linkWithPasskey } = useLinkWithPasskey();
  const { submitEnrollmentWithPasskey, unenrollWithPasskey } = useMfaEnrollment();
  const { init, submit, cancel, clear } = useMfa();
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mfaAsk, setMfaAsk] = useState<MfaMethod[] | null>(null);
  const mfaRequests = useRef(0);
  const add = (step: string, result: string) => setLines((all) => [...all, { step, result }]);

  useRegisterMfaListener({
    onMfaRequired: ({ mfaMethods }) => {
      mfaRequests.current += 1;
      add('Privy asked for MFA', `methods: ${mfaMethods.join(', ') || 'none'}`);
      setMfaAsk(mfaMethods);
    },
  });

  const refusal = refuseEnrollReason(accountView(user));
  const embedded = wallets.find((w) => w.walletClientType === 'privy' && w.type === 'ethereum');
  const account = embeddedAccount(user);

  const reported = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || !authenticated || !user || reported.current === user.id) return;
    reported.current = user.id;
    add('Browser', navigator.userAgent);
    add('Signed in', `${user.email?.address ?? 'no email'} · logins: ${user.linkedAccounts.map((a) => a.type).join(', ')}`);
    add('Allowed to test', refusal ?? 'yes (email-only test account)');
    add('App MFA methods (Privy dashboard)', appMfaMethods.join(', ') || 'NONE: enable passkey MFA in the dashboard');
    add('This user\'s MFA methods', user.mfaMethods.join(', ') || 'none');
  }, [ready, authenticated, user, refusal, appMfaMethods]);

  const run = async (step: string, task: () => Promise<string>) => {
    setBusy(true);
    try {
      add(step, await task());
    } catch (error) {
      add(step, `FAILED ${describe(error)}`);
    } finally {
      setBusy(false);
    }
  };

  const makeWallet = () => run('Create test wallet', async () => {
    if (refusal) return `REFUSED ${refusal}`;
    const wallet = await createWallet();
    return `OK ${wallet.address}`;
  });

  const enroll = () => run('1. Enroll passkey MFA', async () => {
    if (refusal) return `REFUSED ${refusal}`;
    let fresh = await refreshUser();
    const refusedNow = refuseEnrollReason(accountView(fresh));
    if (refusedNow) return `REFUSED ${refusedNow}`;
    if (!fresh.linkedAccounts.some((a) => a.type === 'passkey')) {
      await linkWithPasskey();
      fresh = await refreshUser();
    }
    const credentialIds = fresh.linkedAccounts.flatMap((a) => (a.type === 'passkey' ? [a.credentialId] : []));
    if (credentialIds.length === 0) return 'NO passkey linked after the passkey prompt';
    await submitEnrollmentWithPasskey({ credentialIds });
    const after = await refreshUser();
    return `OK · passkeys ${credentialIds.length} · MFA methods now: ${after.mfaMethods.join(', ') || 'none'}`;
  });

  const sign = (step: string) => run(step, async () => {
    if (!embedded) return 'NO embedded wallet';
    const before = mfaRequests.current;
    const started = performance.now();
    const provider = await embedded.getEthereumProvider();
    const hash = keccak256(crypto.getRandomValues(new Uint8Array(32)));
    const signature = await provider.request({ method: 'secp256k1_sign', params: [hash] });
    const seconds = ((performance.now() - started) / 1000).toFixed(1);
    if (typeof signature !== 'string') return `NO signature (${typeof signature})`;
    const signer = await recoverAddress({ hash, signature: signature as Hex });
    const matches = signer.toLowerCase() === embedded.address.toLowerCase();
    const asked = mfaRequests.current - before;
    return `${matches ? 'OK' : 'WRONG SIGNER'} in ${seconds}s · MFA prompts during this sign: ${asked}${asked === 0 ? ' (no passkey asked)' : ''}`;
  });

  const forget = () => run('Forget MFA verification (clear cache)', async () => {
    await clear();
    return 'cleared: the next sign should ask again';
  });

  const unenroll = () => run('4. Unenroll passkey MFA', async () => {
    await unenrollWithPasskey({ removeForLogin: true });
    const after = await refreshUser();
    return `OK · MFA methods now: ${after.mfaMethods.join(', ') || 'none'} · passkeys linked: ${after.linkedAccounts.filter((a) => a.type === 'passkey').length}`;
  });

  const verifyWithPasskey = async () => {
    setMfaAsk(null);
    try {
      const options = await init('passkey');
      if (!options) throw new Error('Privy returned no passkey challenge');
      await submit('passkey', options);
      add('MFA with passkey', 'OK (verified)');
    } catch (error) {
      add('MFA with passkey', `FAILED ${describe(error)}`);
      cancel();
    }
  };

  const cancelMfa = () => {
    setMfaAsk(null);
    cancel();
    add('MFA', 'cancelled on this page');
  };

  const copy = () => {
    void navigator.clipboard.writeText(resultsText(lines)).then(() => setCopied(true), () => setCopied(false));
  };

  const results = (
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
  );

  return (
    <main className="screen">
      <div className="page-title">Privy passkey test</div>
      <div className="sub fine">For a throwaway Privy account signed in by email only. It refuses any account linked to Telegram: never use your real wallet account here. Unenroll when you are done.</div>
      {!ready && <div className="sub">Loading Privy…</div>}
      {ready && !authenticated && <EmailLogin label="Sign in with a throwaway email" />}
      {ready && authenticated && (
        <>
          {refusal && <p className="error">{refusal}</p>}
          <div className="sub fine">
            Wallet: {account ? `${account.address} · ${account.recoveryMethod === 'privy-v2' ? 'TEE (privy-v2)' : `on-device (${account.recoveryMethod ?? '?'})`}` : 'none yet'}
          </div>
          {mfaAsk && (
            <div className="cells" style={{ padding: 12, display: 'grid', gap: 8 }}>
              <span className="cell-title">Privy asks for verification ({mfaAsk.join(', ')})</span>
              {mfaAsk.includes('passkey') && <button className="btn" onClick={() => void verifyWithPasskey()}>Verify with passkey</button>}
              <button className="btn soft" onClick={cancelMfa}>Cancel</button>
            </div>
          )}
          {results}
          {!refusal && !account && <button className="btn" disabled={busy} onClick={() => void makeWallet()}>Create test wallet</button>}
          <button className="btn" disabled={busy || Boolean(refusal)} onClick={() => void enroll()}>1. Enroll passkey MFA</button>
          <button className="btn soft" disabled={busy || !embedded} onClick={() => void sign('2. Sign a test hash')}>2. Sign a test hash</button>
          <button className="btn soft" disabled={busy || !embedded} onClick={() => void sign('3. Sign again now')}>3. Sign again now</button>
          <button className="btn soft" disabled={busy} onClick={() => void forget()}>Forget verification (then sign again)</button>
          <button className="btn soft" disabled={busy || Boolean(refusal)} onClick={() => void unenroll()}>4. Unenroll passkey MFA</button>
          <button className="btn ink" onClick={copy}>{copied ? 'Copied' : 'Copy results'}</button>
          <button className="text-btn" onClick={() => void logout()}>Log out</button>
        </>
      )}
      {ready && !authenticated && lines.length > 0 && results}
    </main>
  );
}

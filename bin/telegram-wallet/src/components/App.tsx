'use client';

import { useEffect, useState } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { getWasmOrThrow } from '@miden-sdk/miden-sdk';
import type { Signer } from '@openzeppelin/miden-multisig-client';
import { CONFIG_ERRORS, PRIVY_APP_ID, PRIVY_CLIENT_ID } from '@/config/psm';
import { initializeTelegramBridge, setupTelegramChrome } from '@/lib/telegram';
import { AuthGate, DEV_EMAIL_LOGIN } from './AuthGate';
import { WalletProvider } from './WalletProvider';
import { Screens } from './Screens';
import { Fatal, Splash } from './Splash';
import { DevSignerGate } from './DevSignerGate';
import { DEV_LOCAL_SIGNER } from '@/lib/devSigner';
import { InstantPreview } from './InstantPreview';
import { isPasskeyCheck, PasskeyCheck } from './PasskeyCheck';
import { isPrivyPasskeyTest, PrivyPasskeyTest } from './PrivyPasskeyTest';
import { emailRecoverySpike, SpikeEmailRecovery } from './SpikeEmailRecovery';
import { SpikeEmailKey, SpikeSideBySide } from './SpikeEmailKey';
import { EmailKeyFrame, emailRecoveryTest, EmailRecoveryTest } from './EmailRecoveryTest';
import { installRemoteDiag } from '@/lib/remoteDiag';
import { freshStart } from '@/lib/freshStart';
import { hasSavedView, viewKeyFor } from '@/lib/savedView';

export default function App() {
  const [bridgeReady, setBridgeReady] = useState(false);
  // Remounting Privy is how a failed Telegram login is retried (see AuthGate).
  const [attempt, setAttempt] = useState(0);
  const [signer, setSigner] = useState<Signer | null>(null);
  // Opened before on this phone: the home screen shows the last balance and
  // payments at once, while Telegram, Privy and the wallet start underneath.
  const [preview] = useState(() => hasSavedView(viewKeyFor(null)));
  // The screens format addresses with the Miden SDK, whose WebAssembly loads lazily.
  const [wasmReady, setWasmReady] = useState(false);

  useEffect(() => {
    installRemoteDiag();
    void initializeTelegramBridge().then(() => {
      // Mainnet's first open on this phone: no trace of testnet (freshStart.ts).
      // Its local part is done before this returns; the rest runs meanwhile.
      void freshStart();
      setupTelegramChrome();
      setBridgeReady(true);
    });
    // On failure the sign-in (which loads it too) shows the error.
    getWasmOrThrow().then(() => setWasmReady(true), (e: unknown) => console.warn('Miden WebAssembly failed to load', e));
  }, []);

  // The hidden email recovery test on the live site (?test=email-recovery in
  // Telegram, with ?test=email-key embedded from the recovery subdomain).
  const emailTest = bridgeReady ? emailRecoveryTest() : null;
  if (emailTest === 'parent') return <EmailRecoveryTest />;
  if (emailTest === 'frame') return <EmailKeyFrame />;
  // Development spike (never in production): email recovery, 2-of-3 on testnet.
  const spike = bridgeReady ? emailRecoverySpike() : null;
  if (spike === 'email-recovery') return <SpikeEmailRecovery />;
  if (spike === 'email-key') return <SpikeEmailKey />;
  if (spike === 'side-by-side') return <SpikeSideBySide />;
  // The passkey test page (t.me/<bot>?startapp=passkey_check), instead of the wallet.
  if (bridgeReady && isPasskeyCheck()) return <PasskeyCheck />;

  if (CONFIG_ERRORS.length > 0) {
    return <Fatal title="Not configured" message={CONFIG_ERRORS.join(' ')} />;
  }
  // The Privy passkey-MFA test (?privy_passkey_test=1, Safari only), instead of the wallet.
  if (bridgeReady && isPrivyPasskeyTest()) return <PrivyPasskeyTest />;
  const gate = !bridgeReady
    ? null
    : DEV_LOCAL_SIGNER
      ? <DevSignerGate preview={preview} onSigner={setSigner} />
      : <PrivyGate attempt={attempt} preview={preview} onRetry={() => setAttempt((n) => n + 1)} onSigner={setSigner} />;

  // The screens stay mounted from the saved view to the live wallet. They
  // wait for Telegram's script (its menu buttons and events attach on mount)
  // and the SDK's WebAssembly; until then, the saved screen as plain text.
  const live = bridgeReady && wasmReady && (signer !== null || preview);
  return (
    <WalletProvider signer={signer}>
      {live ? <Screens /> : preview ? <InstantPreview /> : <Splash />}
      {gate}
    </WalletProvider>
  );
}

function PrivyGate({ attempt, preview, onRetry, onSigner }: {
  attempt: number;
  preview: boolean;
  onRetry(): void;
  onSigner(signer: Signer | null): void;
}) {
  return (
    <PrivyProvider
      key={attempt}
      appId={PRIVY_APP_ID}
      clientId={PRIVY_CLIENT_ID}
      config={{
        loginMethods: DEV_EMAIL_LOGIN ? ['telegram', 'email'] : ['telegram'],
        appearance: { theme: 'light', accentColor: '#ff6b1a', walletChainType: 'ethereum-only' },
        // Created by AuthGate once the user is known (as in ProjectX: creation on
        // login does not reliably run for the seamless Telegram login).
        embeddedWallets: { ethereum: { createOnLogin: 'off' }, showWalletUIs: false },
      }}
    >
      <AuthGate preview={preview} onRetry={onRetry} onSigner={onSigner} />
    </PrivyProvider>
  );
}

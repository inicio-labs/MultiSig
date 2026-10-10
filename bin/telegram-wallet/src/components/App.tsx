'use client';

import { useEffect, useState } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { CONFIG_ERRORS, PRIVY_APP_ID, PRIVY_CLIENT_ID } from '@/config/psm';
import { initializeTelegramBridge, setupTelegramChrome, telegramColorScheme } from '@/lib/telegram';
import { AuthGate, DEV_EMAIL_LOGIN } from './AuthGate';
import { WalletProvider } from './WalletProvider';
import { Screens } from './Screens';
import { Fatal, Splash } from './Splash';
import { DevSignerGate } from './DevSignerGate';
import { DEV_LOCAL_SIGNER } from '@/lib/devSigner';

export default function App() {
  const [bridgeReady, setBridgeReady] = useState(false);
  // Remounting Privy is how a failed Telegram login is retried (see AuthGate).
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    void initializeTelegramBridge().then(() => {
      setupTelegramChrome();
      setBridgeReady(true);
    });
  }, []);

  if (CONFIG_ERRORS.length > 0) {
    return <Fatal title="Not configured" message={CONFIG_ERRORS.join(' ')} />;
  }
  if (!bridgeReady) return <Splash />;
  if (DEV_LOCAL_SIGNER) return <DevSignerGate />;

  return (
    <PrivyProvider
      key={attempt}
      appId={PRIVY_APP_ID}
      clientId={PRIVY_CLIENT_ID}
      config={{
        loginMethods: DEV_EMAIL_LOGIN ? ['telegram', 'email'] : ['telegram'],
        appearance: { theme: telegramColorScheme(), walletChainType: 'ethereum-only' },
        // Created by AuthGate once the user is known (as in ProjectX: creation on
        // login does not reliably run for the seamless Telegram login).
        embeddedWallets: { ethereum: { createOnLogin: 'off' }, showWalletUIs: false },
      }}
    >
      <AuthGate onRetry={() => setAttempt((n) => n + 1)}>
        {(signer) => (
          <WalletProvider signer={signer}>
            <Screens />
          </WalletProvider>
        )}
      </AuthGate>
    </PrivyProvider>
  );
}

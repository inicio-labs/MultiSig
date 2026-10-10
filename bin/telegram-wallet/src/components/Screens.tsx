'use client';

import { useState } from 'react';
import { insideTelegram, useTelegramBackButton } from '@/lib/telegram';
import { useWallet } from './WalletProvider';
import { Home } from './Home';
import { Receive } from './Receive';
import { Send } from './Send';
import { Fatal } from './Splash';

export type Screen = 'home' | 'send' | 'receive';

const SETUP_LABEL = {
  starting: 'Starting…',
  finding: 'Looking for your account…',
  creating: 'Creating your Miden account…',
  funding: 'Getting test tokens from the network. This usually takes about 10 seconds.',
  activating: 'Activating your account…',
} as const;

export function Screens() {
  const { engine, snapshot } = useWallet();
  const [screen, setScreen] = useState<Screen>('home');
  const busy = snapshot.activity !== null;
  useTelegramBackButton(screen !== 'home' && !busy ? () => setScreen('home') : null);

  const { phase } = snapshot;
  if (phase.kind === 'error') {
    return <Fatal title="Wallet unavailable" message={phase.message} action={{ label: 'Try again', run: () => void engine.start() }} />;
  }
  if (phase.kind !== 'ready') {
    return (
      <main className="screen">
        <div className="center">
          <div className="spinner" aria-hidden />
          <p className="hint" style={{ maxWidth: 280 }}>{SETUP_LABEL[phase.kind]}</p>
        </div>
      </main>
    );
  }
  // Inside Telegram the native back button (above) does this.
  const back = insideTelegram || busy ? undefined : () => setScreen('home');
  if (screen === 'send') return <Send onDone={() => setScreen('home')} onBack={back} />;
  if (screen === 'receive') return <Receive onBack={back} />;
  return <Home onNavigate={setScreen} />;
}

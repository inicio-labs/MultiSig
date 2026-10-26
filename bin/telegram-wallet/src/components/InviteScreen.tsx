'use client';

import { useState, type FormEvent } from 'react';
import { haptic } from '@/lib/telegram';
import { Gate } from './AuthGate';
import { useWallet } from './WalletProvider';

/**
 * Private mainnet: a new wallet joins with an invite code (each new account
 * registers on the network with one). Shown once, on the first open, until a
 * code is accepted; never again after. Public mainnet turns it off
 * (NEXT_PUBLIC_INVITE_ONLY=0).
 */
export function InviteScreen() {
  const { engine, snapshot } = useWallet();
  const [code, setCode] = useState('');
  const { phase } = snapshot;
  // Checking the code, then (asked before creating) making the wallet.
  const checking = phase.kind === 'registering' || phase.kind === 'creating';
  const busyLabel = phase.kind === 'creating' ? 'Creating your wallet…' : 'Checking…';
  const error = phase.kind === 'invite' ? phase.error : undefined;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (checking) return;
    haptic('light');
    void engine.submitInvitationCode(code).then(() => {
      haptic(engine.getSnapshot().phase.kind === 'ready' ? 'success' : 'error');
    });
  };

  return (
    <Gate>
      <main className="screen">
        <form className="center invite" onSubmit={submit}>
          <h1 className="title">Welcome to PrivPay</h1>
          <p className="hint">PrivPay is invite-only for now. Enter the invite code you received to open your wallet.</p>
          <input
            className="field invite-code"
            placeholder="Invite code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            aria-label="Invite code"
            aria-invalid={Boolean(error)}
            disabled={checking}
          />
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn" type="submit" disabled={checking || !code.trim()}>
            {checking ? busyLabel : 'Join'}
          </button>
          <p className="hint fine">Don’t have one? Ask the person who shared PrivPay with you.</p>
        </form>
      </main>
    </Gate>
  );
}

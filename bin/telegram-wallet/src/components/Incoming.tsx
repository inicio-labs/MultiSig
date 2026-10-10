'use client';

import { useState } from 'react';
import { formatError } from '@/lib/errors';
import { haptic } from '@/lib/telegram';
import { useWallet } from './WalletProvider';
import { TokenAmount } from './TokenAmount';

/** Notes waiting to be claimed into the account, with one Claim for all of them. */
export function Incoming() {
  const { engine, snapshot } = useWallet();
  const [error, setError] = useState<string | null>(null);
  if (snapshot.incoming.length === 0) return null;
  const busy = snapshot.activity !== null;

  const claim = () => {
    setError(null);
    engine.claimAll().then(
      () => haptic('success'),
      (e: unknown) => {
        haptic('error');
        setError(formatError(e));
      },
    );
  };

  return (
    <section className="card" style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <strong>{snapshot.incoming.length === 1 ? '1 incoming payment' : `${snapshot.incoming.length} incoming payments`}</strong>
        <button className="btn small" onClick={claim} disabled={busy}>
          {snapshot.activity?.kind === 'claim' ? 'Claiming…' : 'Claim'}
        </button>
      </div>
      {snapshot.incoming.flatMap((note) => note.assets.map((asset, i) => (
        <div key={`${note.id}-${i}`} className="hint">+ <TokenAmount faucetId={asset.faucetId} amount={asset.amount} /></div>
      )))}
      {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
    </section>
  );
}

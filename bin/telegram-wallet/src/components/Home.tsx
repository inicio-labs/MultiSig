'use client';

import { useState } from 'react';
import { accountAddress, shortAddress } from '@/lib/address';
import { MIDEN_NETWORK } from '@/config/psm';
import { useWallet } from './WalletProvider';
import { Incoming } from './Incoming';
import { TokenAmount } from './TokenAmount';
import type { Screen } from './Screens';

export function Home({ onNavigate }: { onNavigate(screen: Screen): void }) {
  const { engine, snapshot } = useWallet();
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const address = snapshot.accountId ? accountAddress(snapshot.accountId) : '';
  const fee = snapshot.feeFaucetId;
  // The fee token (USDCX on testnet) first: it is what most people hold.
  const balances = [...snapshot.balances].sort((a, b) => Number(b.faucetId.toLowerCase() === fee) - Number(a.faucetId.toLowerCase() === fee));

  const copy = () => {
    void navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  const refresh = () => {
    setRefreshing(true);
    engine.refresh().catch((e) => console.warn('Refresh failed', e)).finally(() => setRefreshing(false));
  };

  return (
    <main className="screen">
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="title">Miden Wallet</h1>
          <button onClick={copy} className="hint" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>
            {copied ? 'Address copied' : shortAddress(address)} · {MIDEN_NETWORK}
          </button>
        </div>
        <button className="btn small secondary" onClick={refresh} disabled={refreshing || snapshot.activity !== null} aria-label="Refresh">
          {refreshing ? '…' : '↻'}
        </button>
      </header>

      <section className="card" style={{ display: 'grid', gap: 8 }}>
        <span className="hint">Balance</span>
        {balances.length === 0 ? (
          <span style={{ fontSize: 28, fontWeight: 700 }}>0</span>
        ) : (
          balances.map((b, i) => (
            <TokenAmount key={b.faucetId} faucetId={b.faucetId} amount={b.amount} className={i === 0 ? 'balance-main' : 'balance-other'} />
          ))
        )}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <button className="btn" onClick={() => onNavigate('send')} disabled={balances.length === 0}>Send</button>
        <button className="btn secondary" onClick={() => onNavigate('receive')}>Receive</button>
      </div>

      <Incoming />
      {snapshot.notice && <p className="hint">{snapshot.notice}</p>}
    </main>
  );
}

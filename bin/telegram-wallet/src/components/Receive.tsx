'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { accountAddress } from '@/lib/address';
import { shareText } from '@/lib/telegram';
import { Incoming } from './Incoming';
import { BackLink } from './Splash';
import { useWallet } from './WalletProvider';

export function Receive({ onBack }: { onBack?: () => void }) {
  const { snapshot } = useWallet();
  const address = snapshot.accountId ? accountAddress(snapshot.accountId) : '';
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!address) return;
    // Dark modules on white whatever the theme: scanners expect that contrast.
    QRCode.toDataURL(address, { margin: 1, width: 480, color: { dark: '#000000', light: '#ffffff' } })
      .then(setQr, (e) => console.warn('QR code failed', e));
  }, [address]);

  const copy = () => {
    void navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <main className="screen">
      <BackLink onBack={onBack} />
      <h1 className="title">Receive</h1>
      <section className="card" style={{ display: 'grid', justifyItems: 'center', gap: 14 }}>
        {qr ? (
          <img src={qr} alt="QR code of your address" width={220} height={220} style={{ borderRadius: 12, background: '#fff' }} />
        ) : (
          <div style={{ width: 220, height: 220 }} />
        )}
        <div className="mono" style={{ textAlign: 'center' }}>{address}</div>
      </section>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <button className="btn" onClick={copy}>{copied ? 'Copied' : 'Copy address'}</button>
        <button className="btn secondary" onClick={() => void shareText(address).catch(() => undefined)}>Share</button>
      </div>
      <p className="hint">Payments sent to this address show up here. Claim them to add them to your balance.</p>
      <Incoming />
    </main>
  );
}

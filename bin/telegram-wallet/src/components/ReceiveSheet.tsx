'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { accountAddress, shortAddress } from '@/lib/address';
import { formatError } from '@/lib/errors';
import { payLink } from '@/lib/payLink';
import { haptic, shareLink } from '@/lib/telegram';
import { getTokenInfo, formatTokenAmount } from '@/lib/tokenAmounts';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { TokenAmount } from './TokenAmount';
import { useToast } from './Toast';
import { useWallet } from './WalletProvider';

/** Total per token of the payments waiting to be collected. */
function totals(notes: { assets: { faucetId: string; amount: bigint }[] }[]): Map<string, bigint> {
  const sum = new Map<string, bigint>();
  for (const asset of notes.flatMap((note) => note.assets)) {
    sum.set(asset.faucetId, (sum.get(asset.faucetId) ?? 0n) + asset.amount);
  }
  return sum;
}

export function ReceiveSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const { engine, snapshot } = useWallet();
  const toast = useToast();
  const address = snapshot.accountId ? accountAddress(snapshot.accountId) : '';
  const [qr, setQr] = useState<string | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The network's funding note is collected automatically during setup.
  const waiting = snapshot.phase.kind === 'ready' ? snapshot.incoming : [];

  useEffect(() => {
    if (!address) return;
    QRCode.toDataURL(address, { margin: 1, width: 440, color: { dark: '#1b1410', light: '#ffffff' } })
      .then(setQr, (e) => console.warn('QR code failed', e));
  }, [address]);

  const copy = () => {
    void navigator.clipboard.writeText(address).then(
      () => { haptic('light'); toast('Address copied', 'copy'); },
      () => toast('Copy is not available here', 'alert'),
    );
  };

  const share = () => {
    haptic('light');
    const link = payLink(address);
    void shareLink(link ?? address, link ? 'Pay me on Miden' : 'My Miden address').catch(() => undefined);
  };

  const collect = () => {
    const sum = totals(waiting);
    setCollecting(true);
    setError(null);
    haptic('medium');
    engine.claimAll().then(
      async () => {
        haptic('success');
        const parts = await Promise.all([...sum].map(async ([faucetId, amount]) => {
          const info = await getTokenInfo(faucetId).catch(() => null);
          return info ? `${formatTokenAmount(amount, info.decimals)} ${info.symbol}` : null;
        }));
        const named = parts.filter((part): part is string => part !== null);
        toast(named.length === parts.length && named.length > 0 ? `Added ${named.join(' and ')}` : 'Payments added', 'check');
        onClose();
      },
      (e: unknown) => {
        haptic('error');
        setError(formatError(e));
      },
    ).finally(() => setCollecting(false));
  };

  return (
    <Sheet open={open} onClose={onClose} locked={collecting}>
      <div className="sh-t">Receive</div>
      {qr ? <img className="qr" src={qr} alt="QR code of your address" /> : <div className="qr" />}
      <button className="field" style={{ height: 'auto', padding: '12px 14px', textAlign: 'center', wordBreak: 'break-all' }} onClick={copy}>
        {address}
      </button>
      <div className="chips">
        <button className="chip" onClick={copy}><Icon name="copy" />Copy</button>
        <button className="chip" onClick={share}><Icon name="share" />Share</button>
      </div>

      {waiting.length > 0 ? (
        <>
          <div className="sec">Waiting for you · {waiting.length}</div>
          <div className="list">
            {waiting.map((note) => note.assets.map((asset, i) => (
              <div key={`${note.id}-${i}`} className="row">
                <span className="ico"><Icon name="receive" /></span>
                <div>
                  <div className="t">+<TokenAmount faucetId={asset.faucetId} amount={asset.amount} /></div>
                  <div className="s">Ready to collect</div>
                </div>
              </div>
            )))}
          </div>
          <p className="error">{error}</p>
          <button className="btn" onClick={collect} disabled={collecting || snapshot.activity !== null}>
            {collecting ? 'Collecting…' : 'Collect all'}
          </button>
        </>
      ) : (
        <div className="sub" style={{ padding: '4px 12px 8px' }}>
          New payments to {address ? shortAddress(address) : 'you'} show up here and on the bell.
        </div>
      )}
    </Sheet>
  );
}

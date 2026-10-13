'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import QRCode from 'qrcode';
import { accountAddress, shortAddress } from '@/lib/address';
import { useDirectory } from '@/hooks/useDirectory';
import { alertsAvailable, turnOnAlerts } from '@/lib/alerts';
import { formatError } from '@/lib/errors';
import { payLink } from '@/lib/payLink';
import { usePref } from '@/lib/prefs';
import { haptic, shareLink } from '@/lib/telegram';
import { Icon } from './Icon';
import { ProgressSteps } from './ProgressSteps';
import { DirectoryToggle } from './SettingsSheet';
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

export interface Collected {
  faucetId: string;
  amount: bigint;
  /** Where the Collect button was, for the coins to fly from. */
  from: { x: number; y: number };
}

export function ReceiveSheet({ open, onClose, hidden, onCollected }: {
  open: boolean;
  onClose(): void;
  /** Amounts blurred (hide amounts, or the app was in the background). */
  hidden: boolean;
  onCollected(collected: Collected): void;
}) {
  const { engine, snapshot } = useWallet();
  const toast = useToast();
  const address = snapshot.accountId ? accountAddress(snapshot.accountId) : '';
  const [qr, setQr] = useState<string | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const directory = useDirectory(snapshot.accountId);
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
    // In the directory: friends can also just type the username.
    const text = directory.on && directory.username
      ? `Pay me in PrivPay: @${directory.username}`
      : link ? 'Pay me on Miden' : 'My Miden address';
    void shareLink(link ?? address, text).catch(() => undefined);
  };

  const collect = (e: MouseEvent<HTMLButtonElement>) => {
    const [first] = totals(waiting);
    const rect = e.currentTarget.getBoundingClientRect();
    const from = { x: rect.left + rect.width / 2, y: rect.top };
    setCollecting(true);
    setError(null);
    haptic('medium');
    engine.claimAll().then(
      () => {
        if (first) onCollected({ faucetId: first[0], amount: first[1], from });
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
      <button className="addr-full" onClick={copy}>{address}</button>
      <div className="chips">
        <button className="chip" onClick={copy}><Icon name="copy" />Copy</button>
        <button className="chip" onClick={share}><Icon name="share" />Share</button>
      </div>

      {/* Where people look when they want to get paid: here, not hidden in settings. */}
      {directory.available && (
        <>
          <div className="cells"><DirectoryToggle directory={directory} /></div>
          {directory.username && (
            <div className="sub fine">Anyone who knows your username can find this address. Your balance and payments stay private.</div>
          )}
        </>
      )}

      {waiting.length > 0 ? (
        <>
          <div className="cells">
            <div className="cells-head">Waiting for you · {waiting.length}</div>
            {waiting.map((note) => note.assets.map((asset, i) => (
              <div key={`${note.id}-${i}`} className={`cell${hidden ? ' amounts-hidden' : ''}`}>
                <span className="avatar"><Icon name="receive" /></span>
                <span className="cell-main">
                  <span className="cell-title amount-value">+<TokenAmount faucetId={asset.faucetId} amount={asset.amount} /></span>
                  <span className="cell-sub">Ready to collect</span>
                </span>
              </div>
            )))}
          </div>
          <p className="error">{error}</p>
          {collecting ? (
            <ProgressSteps kind="claim" step={snapshot.activity?.kind === 'claim' ? snapshot.activity.step : 'preparing'} />
          ) : (
            <>
              <button className="btn" onClick={collect} disabled={snapshot.activity !== null}>Collect</button>
              <AlertsOffRow accountId={snapshot.accountId} />
            </>
          )}
        </>
      ) : (
        <div className="sub" style={{ padding: '4px 12px 8px' }}>
          New payments to {address ? shortAddress(address) : 'you'} show up here and on the bell.
        </div>
      )}
    </Sheet>
  );
}

/**
 * After the one-time nudge was answered "Not now": a quiet reminder under
 * Collect while payments wait (never during a collect), only while alerts are off.
 */
function AlertsOffRow({ accountId }: { accountId: string | null }) {
  const [alerts, setAlerts, loaded] = usePref('alerts');
  const [asked] = usePref('alertsAsked');
  const [done, setDone] = useState<'on' | 'gone' | null>(null);
  if (done === 'gone' || !accountId || !loaded || alerts !== false || asked !== true || !alertsAvailable()) {
    return done === 'on' ? <div className="alerts-row on"><Icon name="check" />Alerts on</div> : null;
  }
  const turnOn = () => {
    haptic('light');
    void turnOnAlerts(accountId).then((on) => {
      if (!on) return haptic('error');
      setDone('on');
      setAlerts(true);
      setTimeout(() => setDone('gone'), 1500);
    });
  };
  return (
    <button className="alerts-row" onClick={turnOn}>
      <Icon name="bellOff" /><span className="hint">Alerts are off ·</span><strong>Turn on</strong>
    </button>
  );
}

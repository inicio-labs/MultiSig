'use client';

import { useEffect, useRef, useState } from 'react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { accountAddress, shortAddress } from '@/lib/address';
import { payLinkAddress } from '@/lib/payLink';
import { haptic, setClosingConfirmation, telegramStartParam } from '@/lib/telegram';
import { ActivityList } from './ActivityList';
import { Icon } from './Icon';
import { ReceiveSheet } from './ReceiveSheet';
import { SendSheet } from './SendSheet';
import { BigAmount, TokenAmount } from './TokenAmount';
import { ToastProvider, useToast } from './Toast';
import { useWallet } from './WalletProvider';

export function Screens() {
  return (
    <ToastProvider>
      <WalletHome />
    </ToastProvider>
  );
}

/**
 * The whole app is this one screen plus two sheets. Account setup (find or
 * create, register) runs behind it: the balance shimmers meanwhile, and only
 * Send waits for it.
 */
function WalletHome() {
  const { engine, snapshot } = useWallet();
  const toast = useToast();
  const [sheet, setSheet] = useState<'send' | 'receive' | null>(null);
  const [prefill, setPrefill] = useState<string | null>(null);
  const page = useRef<HTMLElement>(null);
  const indicator = useRef<HTMLDivElement>(null);
  const { phase } = snapshot;
  const ready = phase.kind === 'ready';
  const address = snapshot.accountId ? accountAddress(snapshot.accountId) : '';
  const waiting = ready ? snapshot.incoming.length : 0;

  // The fee token (USDCX on testnet) leads: it is what everyone holds.
  const fee = snapshot.feeFaucetId;
  const [main, ...others] = [...snapshot.balances]
    .sort((a, b) => Number(b.faucetId.toLowerCase() === fee) - Number(a.faucetId.toLowerCase() === fee));

  usePullToRefresh(page, indicator, () => {
    if (!ready) return;
    engine.refresh().then(
      () => toast('Up to date', 'refresh'),
      () => toast('Couldn’t refresh. Check your connection.', 'alert'),
    );
  });

  // A new payment: a tap on the wrist, and the bell's badge.
  const lastWaiting = useRef(0);
  useEffect(() => {
    if (waiting > lastWaiting.current) haptic('light');
    lastWaiting.current = waiting;
  }, [waiting]);

  // Telegram asks before closing while a transaction is in flight.
  const busy = snapshot.activity !== null;
  useEffect(() => setClosingConfirmation(busy), [busy]);

  // Opened from someone's pay link: straight to Send, once the wallet is ready.
  const linkHandled = useRef(false);
  useEffect(() => {
    if (!ready || linkHandled.current) return;
    linkHandled.current = true;
    const to = payLinkAddress(telegramStartParam());
    if (to) {
      setPrefill(to);
      setSheet('send');
    }
  }, [ready]);

  const openSend = () => {
    if (!ready) {
      haptic('warning');
      toast('One moment, your wallet is getting ready', 'clock');
      return;
    }
    haptic('light');
    setPrefill(null);
    setSheet('send');
  };
  const openReceive = () => {
    haptic('light');
    setSheet('receive');
  };
  const copy = () => {
    if (!address) return;
    void navigator.clipboard.writeText(address).then(() => {
      haptic('light');
      toast('Address copied', 'copy');
    });
  };

  return (
    <>
      <div className="ptr" ref={indicator}><Icon name="refresh" /> Release to refresh</div>
      <main className="home" ref={page}>
        <header className="hdr">
          <div className="logo"><b>m</b>iden</div>
          <button className="bell" onClick={openReceive} aria-label={waiting ? `${waiting} payments waiting` : 'Receive'}>
            <Icon name="bell" />
            {waiting > 0 && <span key={waiting} className="badge">{waiting}</span>}
          </button>
        </header>

        <section className="hero">
          <div className="lbl">Your balance</div>
          <div className="amt">
            {main ? <BigAmount faucetId={main.faucetId} amount={main.amount} /> : ready ? '0' : <span className="shim" />}
          </div>
          {others.length > 0 && (
            <div className="others">
              {others.map((b) => <TokenAmount key={b.faucetId} faucetId={b.faucetId} amount={b.amount} />)}
            </div>
          )}
          <button className="addr" onClick={copy} aria-label="Copy your address">
            <Icon name="copy" />
            {address ? shortAddress(address) : <span className="shim small" />}
          </button>
        </section>

        {phase.kind === 'error' && (
          <div className="card-msg">
            <div><strong>Your wallet couldn’t start.</strong> <span className="hint">{phase.message}</span></div>
            <button className="btn soft" onClick={() => void engine.start()}>Try again</button>
          </div>
        )}
        {snapshot.notice && !busy && <div className="card-msg hint">{snapshot.notice}</div>}

        <div className="sec">Recent</div>
        <ActivityList items={snapshot.history} />
      </main>

      <nav className="bar">
        <button className="btn soft" onClick={openReceive}><Icon name="receive" />Receive</button>
        <button className="btn" onClick={openSend}><Icon name="send" />Send</button>
      </nav>

      <SendSheet open={sheet === 'send'} onClose={() => setSheet(null)} prefill={prefill} />
      <ReceiveSheet open={sheet === 'receive'} onClose={() => setSheet(null)} />
    </>
  );
}

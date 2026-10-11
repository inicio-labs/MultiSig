'use client';

import { useEffect, useRef, useState } from 'react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { accountAddress, shortAddress } from '@/lib/address';
import { payLinkAddress } from '@/lib/payLink';
import { haptic, setClosingConfirmation, telegramStartParam, telegramUserName } from '@/lib/telegram';
import { ActivityList } from './ActivityList';
import { Icon } from './Icon';
import { ReceiveSheet } from './ReceiveSheet';
import { SendPage } from './SendPage';
import { TokenAmount } from './TokenAmount';
import { ToastProvider, useToast } from './Toast';
import { WalletCard } from './WalletCard';
import { useWallet } from './WalletProvider';

export function Screens() {
  return (
    <ToastProvider>
      <WalletHome />
    </ToastProvider>
  );
}

/**
 * The card, two actions and the activity: the whole app. Account setup (find
 * or create, register) runs behind it while the balance shimmers; only Send
 * waits for it. Send is its own screen, Receive a sheet.
 */
function WalletHome() {
  const { engine, snapshot } = useWallet();
  const toast = useToast();
  const [view, setView] = useState<'home' | 'send' | 'receive'>('home');
  const [prefill, setPrefill] = useState<string | null>(null);
  const [cardGone, setCardGone] = useState(false);
  const page = useRef<HTMLElement>(null);
  const cardSlot = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLDivElement>(null);
  const { phase } = snapshot;
  const ready = phase.kind === 'ready';
  const address = snapshot.accountId ? accountAddress(snapshot.accountId) : '';
  const waiting = ready ? snapshot.incoming.length : 0;
  const name = useRef(telegramUserName()).current;

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

  // Once the card scrolls away, its balance rides in the top bar.
  useEffect(() => {
    const slot = cardSlot.current;
    if (!slot) return;
    const observer = new IntersectionObserver(([entry]) => setCardGone(!entry.isIntersecting), { threshold: 0.35 });
    observer.observe(slot);
    return () => observer.disconnect();
  }, []);

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
      setView('send');
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
    setView('send');
  };
  const openReceive = () => {
    haptic('light');
    setView('receive');
  };
  const copy = () => {
    if (!address) return;
    void navigator.clipboard.writeText(address).then(
      () => { haptic('light'); toast('Address copied', 'copy'); },
      () => toast('Copy is not available here', 'alert'),
    );
  };

  return (
    <>
      <div className="ptr" ref={indicator}><Icon name="refresh" /> Release to refresh</div>
      <header className={`topbar${cardGone ? ' scrolled' : ''}`}>
        <div className="topbar-balance" aria-hidden={!cardGone}>
          {main && <TokenAmount faucetId={main.faucetId} amount={main.amount} />}
        </div>
        <button className="bell" onClick={openReceive} aria-label={waiting ? `${waiting} ${waiting === 1 ? 'payment' : 'payments'} waiting` : 'Receive'}>
          <Icon name="bell" />
          {waiting > 0 && <span key={waiting} className="badge">{waiting}</span>}
        </button>
      </header>

      <main className="home" ref={page}>
        <div ref={cardSlot}>
          <WalletCard
            balance={main ?? null}
            name={name}
            address={address ? shortAddress(address) : ''}
            loading={!ready && !main}
            onTap={copy}
          />
        </div>
        {others.length > 0 && (
          <div className="others">
            {others.map((b) => <span key={b.faucetId} className="pill"><TokenAmount faucetId={b.faucetId} amount={b.amount} /></span>)}
          </div>
        )}

        <div className="actions">
          <button className="btn soft" onClick={openReceive}><Icon name="receive" />Receive</button>
          <button className="btn" onClick={openSend}><Icon name="send" />Send</button>
        </div>

        {phase.kind === 'error' && (
          <div className="notice">
            <span>Your wallet couldn’t start. <span className="hint">{phase.message}</span></span>
            <button className="btn soft" onClick={() => void engine.start()}>Try again</button>
          </div>
        )}
        {snapshot.notice && !busy && <div className="notice hint">{snapshot.notice}</div>}

        <div className="cells">
          <div className="cells-head">Activity</div>
          <ActivityList items={snapshot.history} />
        </div>
      </main>

      <SendPage open={view === 'send'} prefill={prefill} onClose={() => setView('home')} />
      <ReceiveSheet open={view === 'receive'} onClose={() => setView('home')} />
    </>
  );
}

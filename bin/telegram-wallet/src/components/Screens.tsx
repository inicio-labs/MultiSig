'use client';

import { useEffect, useRef, useState } from 'react';
import type { VaultBalance } from '@openzeppelin/miden-multisig-client';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { accountAddress, shortAddress } from '@/lib/address';
import { payLinkAddress } from '@/lib/payLink';
import { usePref } from '@/lib/prefs';
import { playChime, playTick, unlockSoundOnFirstTouch } from '@/lib/sound';
import {
  hasTelegramSettingsButton,
  haptic,
  onAppActiveChange,
  setClosingConfirmation,
  telegramStartParam,
  telegramUserName,
  useTelegramSettingsButton,
} from '@/lib/telegram';
import { formatTokenAmount, getTokenInfo } from '@/lib/tokenAmounts';
import { ActivityList } from './ActivityList';
import { BURST_LANDS_MS, CoinBurst, type Burst } from './CoinBurst';
import { Icon } from './Icon';
import { ReceiveSheet, type Collected } from './ReceiveSheet';
import { SendSheet } from './SendSheet';
import { SettingsSheet } from './SettingsSheet';
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
 * waits for it. Send, Receive and Settings are sheets over it.
 */
function WalletHome() {
  const { engine, snapshot } = useWallet();
  const toast = useToast();
  const [view, setView] = useState<'home' | 'send' | 'receive' | 'settings'>('home');
  const [prefill, setPrefill] = useState<string | null>(null);
  const [cardGone, setCardGone] = useState(false);
  const [away, setAway] = useState(false);
  const [hideAmounts, setHideAmounts] = usePref('hideAmounts');
  const [burst, setBurst] = useState<Burst | null>(null);
  const [celebration, setCelebration] = useState<{ id: number; text: string } | null>(null);
  // While coins fly, the card keeps the old balance; it rolls up when they land.
  const [held, setHeld] = useState<VaultBalance | null>(null);
  const [bellRing, setBellRing] = useState(0);
  const page = useRef<HTMLElement>(null);
  const cardSlot = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLDivElement>(null);
  const { phase } = snapshot;
  const ready = phase.kind === 'ready';
  const address = snapshot.accountId ? accountAddress(snapshot.accountId) : '';
  const waiting = ready ? snapshot.incoming.length : 0;
  const name = useRef(telegramUserName()).current;
  // USDCX only: an empty wallet still shows "0 USDCX".
  const main = snapshot.balances[0]
    ?? (ready && snapshot.feeFaucetId ? { faucetId: snapshot.feeFaucetId, amount: 0n } : null);
  const shown = held ?? main;
  // Blurred while hide amounts is on, and while the app is in the background
  // (so the app switcher's preview never shows them). Back as it was on return.
  const hidden = hideAmounts === true || away;

  usePullToRefresh(page, indicator, () => {
    if (!ready) return;
    engine.refresh().then(
      () => toast('Up to date', 'refresh'),
      () => toast('Couldn’t refresh. Check your connection.', 'alert'),
    );
  });

  useEffect(() => onAppActiveChange((active) => setAway(!active)), []);
  useEffect(() => unlockSoundOnFirstTouch(), []);

  // Once the card scrolls away, its balance rides in the top bar.
  useEffect(() => {
    const slot = cardSlot.current;
    if (!slot) return;
    const observer = new IntersectionObserver(([entry]) => setCardGone(!entry.isIntersecting), { threshold: 0.35 });
    observer.observe(slot);
    return () => observer.disconnect();
  }, []);

  // A payment arrived: the bell wiggles, a tick and a tap on the wrist.
  const lastWaiting = useRef(0);
  useEffect(() => {
    if (waiting > lastWaiting.current) {
      setBellRing((n) => n + 1);
      haptic('light');
      playTick();
    }
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

  // Settings live in Telegram's own menu for the app; a gear outside Telegram.
  const openSettings = () => {
    haptic('light');
    setView('settings');
  };
  useTelegramSettingsButton(openSettings);
  const settingsInMenu = hasTelegramSettingsButton();

  // Money collected: coins fly into the card, then it pulses, the balance
  // rolls up and the chime plays.
  const collected = ({ faucetId, amount, from }: Collected) => {
    setHeld(main);
    const card = cardSlot.current?.getBoundingClientRect();
    if (card) setBurst({ id: Date.now(), from, to: { x: card.left + card.width * 0.3, y: card.top + card.height * 0.35 } });
    void getTokenInfo(faucetId).catch(() => null).then((info) => {
      const text = info ? `+${formatTokenAmount(amount, info.decimals)}` : '+';
      setTimeout(() => {
        setHeld(null);
        setCelebration({ id: Date.now(), text });
        playChime();
        haptic('success');
        toast(info ? `Money’s in · ${text} ${info.symbol}` : 'Money’s in', 'check');
      }, BURST_LANDS_MS);
    });
  };

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
  const toggleHidden = () => {
    haptic('selection');
    setHideAmounts(!(hideAmounts === true));
  };

  return (
    <>
      <div className="ptr" ref={indicator}><Icon name="refresh" /> Release to refresh</div>
      <header className={`topbar${cardGone ? ' scrolled' : ''}`}>
        <span className="private-pill"><Icon name="lock" /> Private</span>
        <div className={`topbar-balance${hidden ? ' amounts-hidden' : ''}`} aria-hidden={!cardGone}>
          {shown && <span className="amount-value"><TokenAmount faucetId={shown.faucetId} amount={shown.amount} /></span>}
        </div>
        <div className="topbar-actions">
          <button className="bell" onClick={toggleHidden} aria-label={hideAmounts ? 'Show amounts' : 'Hide amounts'} aria-pressed={hideAmounts === true}>
            <Icon name={hideAmounts ? 'eyeOff' : 'eye'} />
          </button>
          {!settingsInMenu && (
            <button className="bell" onClick={openSettings} aria-label="Settings"><Icon name="settings" /></button>
          )}
          <button
            key={bellRing}
            className={`bell${bellRing ? ' ring' : ''}`}
            onClick={openReceive}
            aria-label={waiting ? `${waiting} ${waiting === 1 ? 'payment' : 'payments'} waiting` : 'Receive'}
          >
            <Icon name="bell" />
            {waiting > 0 && <span className="badge">{waiting}</span>}
          </button>
        </div>
      </header>

      <main className="home" ref={page}>
        <div ref={cardSlot}>
          <WalletCard
            balance={shown}
            name={name}
            address={address ? shortAddress(address) : ''}
            loading={!ready && !main}
            hidden={hidden}
            celebration={celebration}
            onTap={copy}
          />
        </div>

        <div className="actions">
          <button className="btn ink" onClick={openReceive}><Icon name="receive" />Receive</button>
          <button className="btn" onClick={openSend}><Icon name="send" />Send</button>
        </div>

        {phase.kind === 'error' && (
          <div className="notice">
            <span>Your wallet couldn’t start. <span className="hint">{phase.message}</span></span>
            <button className="btn soft" onClick={() => void engine.start()}>Try again</button>
          </div>
        )}
        {snapshot.notice && !busy && <div className="notice hint">{snapshot.notice}</div>}

        <div className={`cells${hidden ? ' amounts-hidden' : ''}`}>
          <div className="cells-head">Activity</div>
          <ActivityList items={snapshot.history} />
        </div>
      </main>

      <CoinBurst burst={burst} />
      <SendSheet open={view === 'send'} prefill={prefill} onClose={() => setView('home')} />
      <ReceiveSheet open={view === 'receive'} onClose={() => setView('home')} hidden={hidden} onCollected={collected} />
      <SettingsSheet open={view === 'settings'} onClose={() => setView('home')} />
    </>
  );
}

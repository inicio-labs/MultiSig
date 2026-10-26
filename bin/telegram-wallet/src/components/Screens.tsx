'use client';

import { useEffect, useRef, useState } from 'react';
import type { VaultBalance } from '@openzeppelin/miden-multisig-client';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useTokenInfo } from '@/hooks/useTokenInfo';
import { alertsAvailable, refreshAlerts, turnOnAlerts } from '@/lib/alerts';
import { useContacts, type Contacts } from '@/lib/contacts';
import { completeRegistration, directoryAvailable, isRegistrationLaunch, lookupSelf, startRegistration } from '@/lib/directory';
import { DEV_LOCAL_SIGNER } from '@/lib/devSigner';
import { autoJoinDue, lastAutoJoinAt, markAutoJoin, takeAutoJoin } from '@/lib/directoryAuto';
import { saveFirstPaint } from '@/lib/firstPaint';
import { viewKeyFor } from '@/lib/savedView';
import { accountAddress, shortAddress } from '@/lib/address';
import { isCollectLink, payLinkAddress } from '@/lib/payLink';
import { usePref } from '@/lib/prefs';
import { playChime, playTick, unlockSoundOnFirstTouch } from '@/lib/sound';
import {
  canScanQr,
  haptic,
  onAppActiveChange,
  setClosingConfirmation,
  telegramStartParam,
  telegramUserName,
  telegramUsername,
  onDesktop,
  scanQr,
  useTelegramSettingsButton,
} from '@/lib/telegram';
import { storage } from '@/lib/storage';
import { timeAgo } from '@/lib/timeAgo';
import { formatTokenAmount, getTokenInfo } from '@/lib/tokenAmounts';
import type { ActivityItem } from '@/lib/walletEngine';
import { ActivityList, timeOf, who } from './ActivityList';
import { AlertsNudgeSheet } from './AlertsNudgeSheet';
import { InviteScreen } from './InviteScreen';
import { Gate } from './AuthGate';
import { Splash } from './Splash';
import { BURST_LANDS_MS, CoinBurst, type Burst } from './CoinBurst';
import { Icon } from './Icon';
import { ReceiveSheet, type Collected } from './ReceiveSheet';
import { isScannedAddress, SendSheet } from './SendSheet';
import { SettingsSheet } from './SettingsSheet';
import { canSetUpRecoveryHere, RecoverySheet, type RecoveryFrom } from './RecoverySheet';
import { RecoveryNudgeSheet } from './RecoveryNudgeSheet';
import { canUsePhoneKeyHere, NewPhoneSheet, NotMeSheet, RemovedPhoneSheet, thisPhoneWasRemoved } from './NewPhoneSheet';
import { ChangeEmailSheet } from './ChangeEmailSheet';
import { thisPhone } from '@/lib/thisPhone';
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
  // Opened from the bot's "This wasn't me": what to secure comes first.
  const [view, setView] = useState<'home' | 'send' | 'receive' | 'settings' | 'alerts' | 'recovery' | 'recovery-nudge' | 'new-phone' | 'removed-phone' | 'not-me' | 'change-email'>(
    () => (telegramStartParam() === 'not_me' ? 'not-me' : 'home'),
  );
  const [recoveryFrom, setRecoveryFrom] = useState<RecoveryFrom>('settings');
  const [prefill, setPrefill] = useState<string | null>(null);
  const [cardGone, setCardGone] = useState(false);
  const [away, setAway] = useState(false);
  const [hideAmounts, setHideAmounts] = usePref('hideAmounts');
  const [alerts, setAlerts, alertsLoaded] = usePref('alerts');
  const [directory, setDirectory, directoryLoaded] = usePref('directory');
  const [directoryOff, setDirectoryOff, directoryOffLoaded] = usePref('directoryOff');
  const contacts = useContacts(snapshot.accountId);
  // Sending needs a phone (Face ID or fingerprint): say so on desktop before the tap.
  const phoneOnly = !DEV_LOCAL_SIGNER && onDesktop();
  const [alertsAsked, setAlertsAsked, askedLoaded] = usePref('alertsAsked');
  // First payment collected (or "know when money arrives" if not the first).
  const [firstPayment, setFirstPayment] = useState(true);
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
  // Private mainnet: the invite screen, from the moment a code is needed until
  // one is accepted (it stays up while the code is being checked).
  const [inviting, setInviting] = useState(false);
  useEffect(() => {
    if (phase.kind === 'invite') setInviting(true);
    else if (phase.kind === 'ready' || phase.kind === 'error') setInviting(false);
  }, [phase.kind]);
  // Starting: the screen shows what this phone saw last time, if anything,
  // while the wallet catches up (a few seconds).
  const updating = phase.kind !== 'ready' && phase.kind !== 'error';
  const address = snapshot.accountId ? accountAddress(snapshot.accountId) : '';
  const waiting = ready ? snapshot.incoming.length : 0;
  const name = useRef(telegramUserName()).current;
  // USDCX only: an empty wallet still shows "0 USDCX".
  const main = snapshot.balances[0]
    ?? ((ready || snapshot.savedAt) && snapshot.feeFaucetId ? { faucetId: snapshot.feeFaucetId, amount: 0n } : null);
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

  // Payment alerts on: link this wallet's address again on each open.
  const accountId = snapshot.accountId;
  useEffect(() => {
    if (ready && alerts === true && accountId) void refreshAlerts(accountId);
  }, [ready, alerts, accountId]);

  // The one polite nudge for payment alerts: after a collect, once its coins,
  // roll and chime are done, and only while nothing else is on screen.
  const nudge = useRef({ can: false, view });
  nudge.current = {
    can: alertsLoaded && askedLoaded && alerts === false && alertsAsked === false && alertsAvailable(),
    view,
  };
  // Recovery on, and this phone's key is not on the account: a new phone (or
  // Telegram reinstalled) is offered to add itself, once per open; a phone
  // another one replaced says so, once.
  const needsThisPhone = snapshot.recovery.kind === 'on' && !snapshot.recovery.phoneHere;
  const phoneHere = snapshot.recovery.kind === 'on' && snapshot.recovery.phoneHere;
  useEffect(() => {
    if (phoneHere) thisPhone.markActive();
  }, [phoneHere]);
  const removedHere = needsThisPhone && thisPhoneWasRemoved(snapshot.recovery);
  const phoneOffered = useRef(false);
  useEffect(() => {
    if (!ready || !needsThisPhone || phoneOffered.current || view !== 'home' || !canUsePhoneKeyHere()) return;
    phoneOffered.current = true;
    const seenKey = `miden-tg-wallet:removed-seen:${thisPhone.commitment() ?? ''}`;
    if (removedHere && storage.get(seenKey)) return;
    const timer = setTimeout(() => {
      if (removedHere) storage.set(seenKey, '1');
      setView(removedHere ? 'removed-phone' : 'new-phone');
    }, 1200);
    return () => clearTimeout(timer);
  }, [ready, needsThisPhone, removedHere, view]);

  // One nudge per open, recovery first (it guards the money), alerts next.
  const nudgedThisOpen = useRef(false);
  const recoveryOff = snapshot.recovery.kind === 'off' || snapshot.recovery.kind === 'partial';
  const offerAlertsAfterCollect = () => {
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1200 : 2400;
    setTimeout(() => {
      const { can, view: now } = nudge.current;
      // Another sheet open, or the app in the background: next collect.
      if (nudgedThisOpen.current || now !== 'home' || document.visibilityState !== 'visible') return;
      if (recoveryOff && canSetUpRecoveryHere() && recoveryNudgeDue(accountId)) {
        nudgedThisOpen.current = true;
        markRecoveryNudged(accountId);
        setView('recovery-nudge');
      } else if (can) {
        nudgedThisOpen.current = true;
        setView('alerts');
      }
    }, delay);
  };
  const openRecovery = (from: RecoveryFrom) => {
    haptic('light');
    setRecoveryFrom(from);
    setView('recovery');
  };
  const answerRecoveryNudge = (setUp: boolean) => {
    setView('home');
    // After the sheet has slid away.
    if (setUp) setTimeout(() => openRecovery('nudge'), 350);
  };
  const recoveryDone = () => {
    // From the send gate: back to the send, which kept what was typed.
    setView(recoveryFrom === 'send' ? 'send' : 'home');
  };
  const answerAlerts = (turnOn: boolean) => {
    setAlertsAsked(true);
    setView('home');
    if (!turnOn || !accountId) return;
    // After the sheet has slid away: Telegram's own popup comes next.
    setTimeout(() => {
      void turnOnAlerts(accountId).then((on) => {
        setAlerts(on);
        toast(on ? 'Payment alerts on' : 'Telegram didn’t allow messages, so alerts are off', on ? 'check' : 'alert');
      });
    }, 350);
  };
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

  // Opened from someone's pay link: straight to Send, once the wallet is
  // ready. From a "Tell them" message: straight to Receive, to collect.
  const linkHandled = useRef(false);
  useEffect(() => {
    if (!ready || linkHandled.current) return;
    linkHandled.current = true;
    const param = telegramStartParam();
    const to = payLinkAddress(param);
    if (snapshot.accountId && isRegistrationLaunch(snapshot.accountId)) {
      // Reopened from our own registration link: Telegram has signed it.
      // Joined by itself (on by default): quietly, the switch in Settings
      // shows it; a failure is tried again tomorrow.
      const auto = takeAutoJoin();
      void completeRegistration().then((ok) => {
        if (ok) {
          setDirectory(true);
          setDirectoryOff(false);
        }
        if (!auto) toast(ok ? 'Friends can now pay you by your @username' : 'Couldn’t turn on pay-by-username. Try again.', ok ? 'check' : 'alert');
      });
    } else if (to) {
      setPrefill(to);
      setView('send');
    } else if (isCollectLink(param)) {
      setView('receive');
      void engine.refresh().catch(() => undefined);
    }
  }, [ready, engine]);

  // Pay-by-@username is on by default, like a UPI ID (directoryAuto.ts): a
  // wallet whose owner has not turned it off joins by itself, from home with
  // nothing else going on. Joining reopens the wallet for Telegram to sign.
  const username = useRef(telegramUsername()).current;
  const [joining, setJoining] = useState(false);
  const autoJoinTried = useRef(false);
  useEffect(() => {
    if (autoJoinTried.current || !accountId) return;
    const due = autoJoinDue({
      on: directory,
      off: directoryOff,
      loaded: directoryLoaded && directoryOffLoaded,
      hasUsername: Boolean(username),
      available: directoryAvailable(),
      openedFromLink: Boolean(telegramStartParam()),
      idle: ready && view === 'home' && !busy,
      lastTriedAt: lastAutoJoinAt(),
      now: Date.now(),
    });
    if (!due) return;
    autoJoinTried.current = true;
    markAutoJoin(Date.now());
    setJoining(true);
    startRegistration(accountId);
    // Still here: the wallet did not reopen (outside Telegram); try another day.
    setTimeout(() => {
      takeAutoJoin();
      setJoining(false);
    }, 4000);
  }, [accountId, directory, directoryOff, directoryLoaded, directoryOffLoaded, username, ready, view, busy]);

  // In the directory: check once per open that the entry is still there and
  // names this wallet (the server can drop or serve an old one; it cannot fake one).
  const selfChecked = useRef(false);
  useEffect(() => {
    if (!ready || !directoryLoaded || directory !== true || selfChecked.current || !accountId) return;
    if (isRegistrationLaunch(accountId)) return;
    selfChecked.current = true;
    void lookupSelf().then((entry) => {
      if (entry?.address === accountId.toLowerCase()) return;
      // Gone from the server: joins again by itself (unless turned off).
      setDirectory(false);
    });
  }, [ready, directory, directoryLoaded, accountId, setDirectory]);

  // Settings live in Telegram's own menu for the app; a gear outside Telegram.
  const openSettings = () => {
    haptic('light');
    setView('settings');
  };
  useTelegramSettingsButton(openSettings);

  // Money collected: coins fly into the card, then it pulses, the balance
  // rolls up and the chime plays.
  const collected = ({ faucetId, amount, from }: Collected) => {
    setFirstPayment(!snapshot.history.some((item) => item.direction === 'in'));
    offerAlertsAfterCollect();
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
    // Recovery on, and this phone's key is not on the account: add this phone first.
    if (needsThisPhone && canUsePhoneKeyHere()) {
      setView('new-phone');
      return;
    }
    setPrefill(null);
    setView('send');
  };
  // Scan a friend's QR from home: Send opens with them filled in.
  const scanToPay = async () => {
    if (!ready) {
      haptic('warning');
      toast('One moment, your wallet is getting ready', 'clock');
      return;
    }
    haptic('light');
    const text = await scanQr('Scan a Miden address', isScannedAddress);
    if (!text) return;
    setPrefill(text);
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
        {updating ? (
          <div className="updating" role="status"><span className="spin" />Updating…</div>
        ) : (
          <div className={`topbar-balance${hidden ? ' amounts-hidden' : ''}`} aria-hidden={!cardGone}>
            {shown && <span className="amount-value"><TokenAmount faucetId={shown.faucetId} amount={shown.amount} /></span>}
          </div>
        )}
        <div className="topbar-actions">
          {canScanQr() && (
            <button className="bell" onClick={() => void scanToPay()} aria-label="Scan a QR code to pay"><Icon name="scan" /></button>
          )}
          <button className="bell" onClick={toggleHidden} aria-label={hideAmounts ? 'Show amounts' : 'Hide amounts'} aria-pressed={hideAmounts === true}>
            <Icon name={hideAmounts ? 'eyeOff' : 'eye'} />
          </button>
          {/* Inside Telegram too: its own menu item alone is too hidden. */}
          <button className="bell" onClick={openSettings} aria-label="Settings"><Icon name="settings" /></button>
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
            caption={updating && snapshot.savedAt ? `Updated ${timeAgo(snapshot.savedAt)}` : null}
            hidden={hidden}
            celebration={celebration}
            onTap={copy}
          />
        </div>

        <div className="actions">
          <button className="btn ink" onClick={openReceive}><Icon name="receive" />Receive</button>
          <button className="btn" onClick={openSend}>
            <Icon name="send" />Send
            {phoneOnly
              ? <span className="btn-tag">Phone only</span>
              : needsThisPhone && <span className="btn-tag">{removedHere ? 'Removed' : 'Add phone'}</span>}
          </button>
        </div>

        {phase.kind === 'error' && (
          <div className="notice">
            <span>Your wallet couldn’t start. <span className="hint selectable">{phase.message}</span></span>
            <div className="actions">
              <button
                className="btn soft"
                onClick={() => void navigator.clipboard.writeText(phase.message).then(
                  () => toast('Details copied', 'copy'),
                  () => toast('Copy is not available here', 'alert'),
                )}
              >
                Copy details
              </button>
              <button className="btn soft" onClick={() => void engine.start()}>Try again</button>
            </div>
          </div>
        )}
        {snapshot.notice && !busy && <div className="notice hint">{snapshot.notice}</div>}

        <div className={`activity${hidden ? ' amounts-hidden' : ''}${updating ? ' updating' : ''}`}>
          <ActivityList items={snapshot.history} loading={updating} contacts={contacts} />
        </div>
      </main>

      {ready && main && (
        <FirstPaintSaver balance={main} history={snapshot.history} name={name} address={address ? shortAddress(address) : ''} contacts={contacts} />
      )}
      <CoinBurst burst={burst} />
      <SendSheet open={view === 'send'} prefill={prefill} onClose={() => setView('home')} onSetUpRecovery={canSetUpRecoveryHere() ? () => openRecovery('send') : undefined} />
      <ReceiveSheet
        open={view === 'receive'}
        onClose={() => setView('home')}
        hidden={hidden}
        onCollected={collected}
        onSetUpRecovery={canSetUpRecoveryHere() ? () => openRecovery('receive') : undefined}
      />
      <SettingsSheet
        open={view === 'settings'}
        onClose={() => setView('home')}
        accountId={snapshot.accountId}
        onRecovery={() => openRecovery('settings')}
        onUseThisPhone={canUsePhoneKeyHere() ? () => setView('new-phone') : undefined}
        onChangeEmail={canUsePhoneKeyHere() ? () => setView('change-email') : undefined}
      />
      <AlertsNudgeSheet open={view === 'alerts'} firstPayment={firstPayment} onAnswer={answerAlerts} />
      <RecoveryNudgeSheet open={view === 'recovery-nudge'} firstPayment={firstPayment} onAnswer={answerRecoveryNudge} />
      {ready && <RecoverySheet open={view === 'recovery'} from={recoveryFrom} onClose={() => setView('home')} onDone={recoveryDone} />}
      {/* Stays up after the move succeeds, for "This phone is ready". */}
      {ready && (needsThisPhone || view === 'new-phone') && <NewPhoneSheet open={view === 'new-phone'} onClose={() => setView('home')} />}
      <RemovedPhoneSheet open={view === 'removed-phone'} onClose={() => setView('home')} />
      <NotMeSheet open={view === 'not-me'} onClose={() => setView('home')} />
      {ready && phoneHere && <ChangeEmailSheet open={view === 'change-email'} onClose={() => setView('home')} />}
      {inviting && <InviteScreen />}
      {/* A new phone or user (nothing saved): a plain loading screen until the
          wallet is found, never an empty home that then turns into Welcome. */}
      {!inviting && !snapshot.accountId && !snapshot.savedAt && (phase.kind === 'starting' || phase.kind === 'finding' || phase.kind === 'creating') && (
        <Gate><Splash label={phase.kind === 'creating' ? 'Creating your wallet…' : 'Opening PrivPay…'} /></Gate>
      )}
      {joining && <Gate><Splash label="Setting up your wallet…" /></Gate>}
    </>
  );
}

/**
 * After every refresh: this screen as plain text, for the next open's
 * instant first paint (firstPaint.ts). Inside Telegram only (keyed by user).
 */
function FirstPaintSaver({ balance, history, name, address, contacts }: {
  balance: VaultBalance;
  history: ActivityItem[];
  name: string | null;
  address: string;
  contacts: Contacts;
}) {
  const token = useTokenInfo(balance.faucetId);
  useEffect(() => {
    const viewKey = viewKeyFor(null);
    if (!viewKey || token.status !== 'ready') return;
    const { decimals, symbol } = token.info;
    saveFirstPaint(viewKey, {
      balance: formatTokenAmount(balance.amount, decimals),
      symbol,
      name,
      address,
      rows: history.slice(0, 8).map((item) => ({
        in: item.direction === 'in',
        sub: who(item, contacts),
        value: `${item.direction === 'in' ? '+' : '−'}${formatTokenAmount(item.amount, decimals)} ${symbol}`,
        ts: timeOf(item),
      })),
      savedAt: Date.now(),
    });
  }, [balance, history, name, address, token, contacts]);
  return null;
}

// The recovery nudge comes back at most once a week (Receive, Send and Settings keep a way to it).
const RECOVERY_NUDGE_KEY = 'miden-tg-wallet:recovery-nudged:';
const RECOVERY_NUDGE_EVERY_MS = 7 * 24 * 60 * 60 * 1000;

function recoveryNudgeDue(accountId: string | null): boolean {
  if (!accountId) return false;
  const at = Number(storage.get(RECOVERY_NUDGE_KEY + accountId.toLowerCase()));
  return !(at > 0) || Date.now() - at >= RECOVERY_NUDGE_EVERY_MS;
}

function markRecoveryNudged(accountId: string | null): void {
  if (accountId) storage.set(RECOVERY_NUDGE_KEY + accountId.toLowerCase(), String(Date.now()));
}

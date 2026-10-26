'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccountId } from '@miden-sdk/miden-sdk';
import { useTokenInfo } from '@/hooks/useTokenInfo';
import { accountAddress, shortAddress } from '@/lib/address';
import { confirmWithBiometrics, sendLock, type SendLock } from '@/lib/biometrics';
import { DEV_LOCAL_SIGNER } from '@/lib/devSigner';
import { alertRecipient } from '@/lib/alerts';
import { contactFor, contactLabel, matchContacts, saveContact, useContacts } from '@/lib/contacts';
import { lookupUsername } from '@/lib/directory';
import { formatError } from '@/lib/errors';
import { feeLabel } from '@/lib/fees';
import { toHexAccountId } from '@/lib/helpers';
import { assertAddressOnNetwork } from '@/lib/midenNetwork';
import { MIDEN_NETWORK } from '@/config/psm';
import { reportDiag } from '@/lib/remoteDiag';
import { canScanQr, haptic, onAppActiveChange, onDesktop, scanQr, shareText, telegramBiometrics } from '@/lib/telegram';
import { PhoneKeyNotConfirmed } from '@/lib/phoneKey';
import { thisPhone } from '@/lib/thisPhone';
import { useBiometricName } from './RecoverySheet';
import { formatTokenAmount, parseTokenAmount } from '@/lib/tokenAmounts';
import { Icon } from './Icon';
import { ProgressSteps } from './ProgressSteps';
import type { DirectoryEntry } from '@/lib/telegramProof';
import { RollingNumber } from './RollingNumber';
import { SendFlow } from './SendFlow';
import { Sheet } from './Sheet';
import { SlideToSend } from './SlideToSend';
import { TokenSymbol } from './TokenAmount';
import { useWallet } from './WalletProvider';


type Step = 'to' | 'amount' | 'sending' | 'sent';

// Development with the browser-held key (never a production build): no Telegram to scan with.
const SKIP_SCAN = DEV_LOCAL_SIGNER;

/** Why sending is off here, and what fixes it. */
const LOCKED: Record<Exclude<SendLock, 'ok'>, { title: string; text: string; action?: 'settings' | 'retry' }> = {
  'no-telegram': {
    title: 'Sending works on your phone',
    text: 'Every send is confirmed with Face ID or a fingerprint, so open this wallet in Telegram on your phone to send. Here you can see your balance and receive.',
  },
  'no-biometrics': {
    title: 'Set up Face ID or a fingerprint',
    text: 'Every send is confirmed with Face ID or a fingerprint. Turn one on in your phone’s settings, then come back.',
  },
  'no-answer': {
    title: 'Couldn’t check Face ID',
    text: 'Telegram didn’t answer. Try again in a moment.',
    action: 'retry',
  },
  denied: {
    title: 'Allow Face ID for this wallet',
    text: 'Every send is confirmed with Face ID or a fingerprint. Allow it in Telegram’s settings for this wallet.',
    action: 'settings',
  },
};

/**
 * Fees are paid in the fee token (USDCX on testnet), from the same balance, so
 * a send must leave 0.001 of it: several times today's testnet fee (~0.00013).
 */
function feeReserve(decimals: number): bigint {
  return 10n ** BigInt(Math.max(decimals - 3, 0));
}

function parseRecipient(input: string, ownId: string | null): { hex: string; address: string } {
  const value = input.trim();
  if (!value) throw new Error('Add an address first');
  // A testnet address pasted into the mainnet wallet (or an old pay link): refuse, never guess.
  assertAddressOnNetwork(value, MIDEN_NETWORK);
  let hex: string;
  try {
    hex = toHexAccountId(value);
    AccountId.fromHex(hex);
  } catch {
    throw new Error('That’s not a Miden address');
  }
  if (ownId && hex.toLowerCase() === ownId.toLowerCase()) throw new Error('That’s your own address');
  return { hex, address: accountAddress(hex) };
}

/** A QR the scanner accepts: a Miden address on this network. */
export function isScannedAddress(value: string): boolean {
  try {
    parseRecipient(value, null);
    return true;
  } catch {
    return false;
  }
}

/** Digits and one decimal point, at most `decimals` places. */
function cleanAmount(raw: string, decimals: number): string {
  let value = raw.replace(',', '.').replace(/[^\d.]/g, '');
  const dot = value.indexOf('.');
  if (dot >= 0) value = value.slice(0, dot + 1) + value.slice(dot + 1).replace(/\./g, '').slice(0, decimals);
  if (decimals === 0) value = value.replace('.', '');
  return value.replace(/^0+(?=\d)/, '');
}

/**
 * Send, as a sheet over the home screen: who, a big amount on the phone's own
 * keyboard (the sheet rides on top of it), private by default, and a slide to
 * send. Swipe down to cancel, like Receive.
 */
export function SendSheet({ open, prefill, onClose, onSetUpRecovery }: {
  open: boolean;
  prefill: string | null;
  onClose(): void;
  /** Opens recovery setup (the send gate); the send is kept and comes back after. */
  onSetUpRecovery?(): void;
}) {
  const { engine, snapshot } = useWallet();
  const amountInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('to');
  const [input, setInput] = useState('');
  // `person`: paid by Telegram name (now or before), remembered for next time.
  const [recipient, setRecipient] = useState<{ hex: string; address: string; label?: string; person?: { name: string; username: string | null } } | null>(null);
  // "@alex": looked up in the Telegram directory, checked on this phone.
  const [found, setFound] = useState<DirectoryEntry | 'looking' | 'none' | null>(null);
  const [faucetId, setFaucetId] = useState('');
  const [amount, setAmount] = useState('');
  const [isPrivate, setPrivate] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [sent, setSent] = useState('');
  const [fee, setFee] = useState<bigint | null>(null);
  // Checked on opening (and on coming back from settings): a device that
  // cannot scan does not get as far as the slide.
  const [lock, setLock] = useState<SendLock | null>(null);
  const checkLock = useCallback(() => {
    if (SKIP_SCAN) return setLock('ok');
    // Desktop: known at once, no prompt to wait for.
    if (onDesktop()) return setLock('no-telegram');
    void sendLock(telegramBiometrics()).then(setLock);
  }, []);
  useEffect(() => {
    if (!open) return;
    checkLock();
    return onAppActiveChange((active) => { if (active) checkLock(); });
  }, [open, checkLock]);

  const balances = snapshot.balances;
  const balance = balances.find((b) => b.faucetId === faucetId);
  const token = useTokenInfo(faucetId || '0x0');
  const decimals = token.status === 'ready' ? token.info.decimals : 0;
  // From $20 (USDCX), sending needs recovery (recovery.ts); a heads-up from $15.
  const recoveryOff = snapshot.recovery.kind === 'off' || snapshot.recovery.kind === 'partial';
  const dollars = (n: number) => BigInt(n) * 10n ** BigInt(decimals);
  const held = balance?.amount ?? 0n;
  const gated = Boolean(onSetUpRecovery) && recoveryOff && decimals > 0 && held >= dollars(20);
  const soonGated = Boolean(onSetUpRecovery) && recoveryOff && decimals > 0 && !gated && held >= dollars(15);
  const bio = useBiometricName();
  const symbol = token.status === 'ready' ? token.info.symbol : '';

  const recents = useMemo(() => {
    const seen = new Set<string>();
    return snapshot.history
      .filter((item) => item.direction === 'out' && item.counterparty)
      .map((item) => item.counterparty!)
      .filter((id) => !seen.has(id.toLowerCase()) && seen.add(id.toLowerCase()))
      .slice(0, 4);
  }, [snapshot.history]);

  const fail = (message: string) => {
    setError(message);
    setShake((n) => n + 1);
    haptic('error');
  };

  // Called from the tap or keystroke that picked the recipient: iOS opens the
  // keyboard only for a focus made while handling the user's own input.
  const contacts = useContacts(snapshot.accountId);
  const pick = (value: string, { quiet = false, person }: { quiet?: boolean; person?: { name: string; username: string | null } } = {}): boolean => {
    try {
      const parsed = parseRecipient(value, snapshot.accountId);
      // A known person, however they were picked (typed address, recents, QR).
      const known = person ?? contactFor(contacts, parsed.hex);
      setRecipient({
        ...parsed,
        label: known ? (known.username ? `@${known.username}` : known.name) : undefined,
        person: known ? { name: known.name, username: known.username } : undefined,
      });
    } catch (e) {
      if (!quiet) fail(formatError(e));
      return false;
    }
    setError(null);
    setStep('amount');
    amountInput.current?.focus();
    haptic('light');
    return true;
  };

  // Each opening starts fresh; a pay link fills in the recipient.
  useEffect(() => {
    if (!open) return;
    const fee = balances.find((b) => b.faucetId.toLowerCase() === snapshot.feeFaucetId);
    setFaucetId((fee ?? balances[0])?.faucetId ?? '');
    setAmount('');
    setPrivate(true);
    setError(null);
    setRecipient(null);
    setInput(prefill ?? '');
    setStep('to');
    if (prefill) pick(prefill);
    // Only on opening: later balance updates must not reset the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill]);

  // People paid by name before, as soon as a few letters match.
  const suggestions = step === 'to' && input.trim() && !input.trim().startsWith('mtst') && !input.trim().startsWith('0x')
    ? matchContacts(contacts, input)
    : [];

  // Typing @username: look it up after a short pause.
  const handle = /^@[A-Za-z0-9_]{4,32}$/.test(input.trim()) ? input.trim() : null;
  useEffect(() => {
    if (!handle) return setFound(null);
    setFound('looking');
    let current = true;
    const timer = setTimeout(() => {
      void lookupUsername(handle).then((entry) => { if (current) setFound(entry ?? 'none'); });
    }, 450);
    return () => { current = false; clearTimeout(timer); };
  }, [handle]);

  const busy = step === 'sending';
  // Face ID runs before the engine starts: that is still "confirming it's you".
  const sendStep = snapshot.activity?.kind === 'send' ? snapshot.activity.step : 'preparing';
  // Telegram's back button (via the sheet) steps back to the recipient, then closes.
  const back = step === 'amount' ? () => setStep('to') : null;

  const scan = async () => {
    haptic('light');
    const text = await scanQr('Scan a Miden address', isScannedAddress);
    if (text) {
      setInput(text);
      pick(text);
    }
  };

  const paysFee = faucetId.toLowerCase() === snapshot.feeFaucetId;
  // What a send costs, before sliding: the last fee this wallet paid, else the
  // amount it keeps back for one.
  const lastFee = snapshot.history.find((item) => item.fee)?.fee?.amount;
  const feeEstimate = token.status === 'ready' && paysFee
    ? feeLabel(lastFee ?? feeReserve(decimals), decimals, symbol)
    : null;

  const send = () => {
    if (!recipient || !balance || token.status !== 'ready') return;
    let units: bigint;
    try {
      units = parseTokenAmount(amount || '0', decimals);
    } catch {
      return fail('Enter an amount');
    }
    if (units > balance.amount) return fail('That’s more than you have');
    // Checked again at the slide: the balance may have grown since Send opened.
    if (gated) return fail('Set up recovery first: sending from $20 needs it.');
    // Never the whole balance: the fee comes out of it too.
    const reserve = paysFee ? feeReserve(decimals) : 0n;
    if (units + reserve > balance.amount) {
      return fail(`Leave ${formatTokenAmount(reserve, decimals)} ${symbol} for the fee`);
    }
    setError(null);
    setFee(null);
    amountInput.current?.blur();
    setStep('sending');
    const label = `${formatTokenAmount(units, decimals)} ${symbol}`;
    setSent(label);
    // Face ID first, while the first step ("Confirming it’s you") shows.
    // Recovery on: that scan unlocks this phone's key, which signs the
    // payment with the Telegram key (one scan for both).
    const phoneKey = snapshot.recovery.kind === 'on' ? thisPhone.key() : null;
    const go = async () => {
      if (phoneKey) {
        try {
          return await phoneKey.withKey(`Send ${label}`, () => engine.send(recipient.hex, faucetId, units, { private: isPrivate }));
        } catch (e) {
          if (e instanceof PhoneKeyNotConfirmed) {
            setStep('amount');
            fail('Not confirmed. Slide to try again.');
            return null;
          }
          throw e;
        }
      }
      const scan = SKIP_SCAN ? 'ok' : await confirmWithBiometrics(telegramBiometrics(), `Send ${label}`);
      if (scan !== 'ok') {
        setStep('amount');
        if (scan === 'failed') fail('Not confirmed. Slide to try again.');
        else setLock(scan);
        return null;
      }
      return engine.send(recipient.hex, faucetId, units, { private: isPrivate });
    };
    const finish = async () => {
      const result = await go();
      if (!result) return;
      alertRecipient(recipient.hex);
      if (recipient.person && snapshot.accountId) {
        saveContact(snapshot.accountId, { address: recipient.hex, ...recipient.person });
      }
      setFee(result.fee);
      haptic('success');
      setStep('sent');
    };
    finish().catch((e: unknown) => {
      reportDiag('send.error', e);
      setStep('amount');
      fail(formatError(e));
    });
  };

  // After a send: tell them in their chat, from your own account (you pick
  // the chat and press send). No link: their address may be in any Miden wallet,
  // so the message names it.
  const tellThem = () => {
    if (!recipient) return;
    haptic('light');
    // The full address: they may have several wallets; this says which one.
    void shareText(
      `Hi! I've sent you ${sent}${isPrivate ? ' privately' : ''} to your address ${recipient.address}. `
      + 'Please claim it in your Miden wallet.',
    ).catch(() => undefined);
  };

  return (
    <Sheet open={open} onClose={onClose} onBack={back ?? undefined} locked={busy} aboveKeyboard>
      {/* Always mounted, so a tap can focus it (see pick). */}
      <input
        ref={amountInput}
        className="amount-input"
        inputMode="decimal"
        autoComplete="off"
        value={amount}
        onChange={(e) => { setAmount(cleanAmount(e.target.value, decimals)); setError(null); haptic('selection'); }}
        tabIndex={step === 'amount' ? 0 : -1}
        aria-label="Amount"
      />

      {lock && lock !== 'ok' && (step === 'to' || step === 'amount') && (
        <div className="center locked">
          <div className="done locked-icon"><Icon name={lock === 'no-telegram' ? 'phone' : 'lock'} /></div>
          <div className="page-title">{LOCKED[lock].title}</div>
          <div className="sub">{LOCKED[lock].text}</div>
          {LOCKED[lock].action === 'settings' && (
            <button className="btn" onClick={() => telegramBiometrics()?.openSettings()}>Open settings</button>
          )}
          {LOCKED[lock].action === 'retry' && (
            <button className="btn soft" onClick={checkLock}>Try again</button>
          )}
        </div>
      )}

      {(!lock || lock === 'ok') && gated && (step === 'to' || step === 'amount') && (
        <div className="center locked">
          <div className="done locked-icon"><Icon name="lock" /></div>
          <div className="page-title">Set up recovery to send</div>
          <div className="sub">You now have $20 or more. To keep it safe, sending needs {bio} and a recovery email first.</div>
          <div className="sub fine-center">About a minute. You can still receive and collect.</div>
          <button className="btn" onClick={onSetUpRecovery}>Set up recovery</button>
          <button className="text-btn" onClick={onClose}>Not now</button>
        </div>
      )}

      {(!lock || lock === 'ok') && !gated && soonGated && step === 'to' && (
        <div className="sub fine-center">
          From $20, sending needs recovery · <button className="text-link" onClick={onSetUpRecovery}>Set up</button>
        </div>
      )}

      {(!lock || lock === 'ok') && !gated && step === 'to' && (
        <>
          <div className="page-title">Send</div>
          <div className="field-wrap">
            <input
              className="field"
              placeholder="@username or Miden address"
              value={input}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              onChange={(e) => { setInput(e.target.value); setError(null); pick(e.target.value, { quiet: true }); }}
              onKeyDown={(e) => e.key === 'Enter' && pick(input)}
            />
            {canScanQr() && (
              <button className="field-icon" onClick={scan} aria-label="Scan a QR code"><Icon name="scan" /></button>
            )}
          </div>
          {suggestions.length > 0 && (
            <div className="cells">
              <div className="cells-head">People you paid</div>
              {suggestions.map((c) => (
                <button key={c.address} className="cell" onClick={() => pick(c.address, { person: c })}>
                  <span className="avatar">{c.name.slice(0, 1).toUpperCase()}</span>
                  <span className="cell-main">
                    <span className="cell-title">{c.name}</span>
                    <span className="cell-sub">{c.username ? `@${c.username}` : shortAddress(accountAddress(c.address))}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {handle && !(found && typeof found === 'object' && suggestions.some((c) => c.address === found.address)) && (
            <div className="cells">
              {found === 'looking' && <div className="empty">Looking up {handle}…</div>}
              {found === 'none' && <div className="empty">{handle} can’t be paid by username yet.</div>}
              {found && typeof found === 'object' && (
                found.address === snapshot.accountId?.toLowerCase() ? <div className="empty">That’s you</div> : (
                  <button className="cell" onClick={() => pick(found.address, { person: { name: found.name, username: found.username } })}>
                    <span className="avatar">{found.name.slice(0, 1).toUpperCase()}</span>
                    <span className="cell-main">
                      <span className="cell-title">{found.name}</span>
                      <span className="cell-sub">@{found.username} · verified by Telegram</span>
                    </span>
                  </button>
                )
              )}
            </div>
          )}
          {!input.trim() && recents.length > 0 && (
            <div className="cells">
              <div className="cells-head">Recent</div>
              {recents.map((id) => {
                const contact = contactFor(contacts, id);
                return (
                  <button key={id} className="cell" onClick={() => pick(id)}>
                    <span className="avatar">{contact ? contact.name.slice(0, 1).toUpperCase() : <Icon name="user" />}</span>
                    <span className="cell-main">
                      {contact ? (
                        <><span className="cell-title">{contact.name}</span><span className="cell-sub">{contactLabel(contact)}</span></>
                      ) : (
                        <span className="cell-title mono-ish">{shortAddress(accountAddress(id))}</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <p className="error">{error}</p>
        </>
      )}

      {(!lock || lock === 'ok') && !gated && step === 'amount' && recipient && (
        <>
          <div className="page-title">To <span className="to-addr">{recipient.label ?? shortAddress(recipient.address)}</span></div>
          <button key={shake} className={`amount${shake ? ' shake' : ''}`} onClick={() => amountInput.current?.focus()}>
            <RollingNumber value={amount || '0'} className="fast" />
            <span className="caret" />
            <small>{symbol}</small>
          </button>
          <div className="amount-meta">
            {balance && token.status === 'ready' && (
              <span className="pill">Balance {formatTokenAmount(balance.amount, decimals)}</span>
            )}
            {feeEstimate && <span className="pill quiet">Fee {feeEstimate}</span>}
            {balances.length > 1 && balances.map((b) => (
              <button
                key={b.faucetId}
                className={`pill${b.faucetId === faucetId ? ' on' : ''}`}
                onClick={() => { setFaucetId(b.faucetId); setAmount(''); haptic('selection'); amountInput.current?.focus(); }}
              >
                <TokenSymbol faucetId={b.faucetId} />
              </button>
            ))}
          </div>
          <button className="private" onClick={() => { setPrivate((p) => !p); haptic('selection'); }} role="switch" aria-checked={isPrivate}>
            <span><Icon name="lock" /> Private</span>
            <span className={`switch${isPrivate ? ' on' : ''}`} />
          </button>
          <p className="error">{error}</p>
          <div className="page-bottom">
            <SlideToSend label={isPrivate ? 'Slide to send privately' : 'Slide to send'} onSlide={send} />
          </div>
        </>
      )}

      {step === 'sending' && (
        <div className="sending">
          <div className="page-title">Sending {sent}</div>
          {recipient && (
            <SendFlow
              stage={sendStep === 'preparing' || sendStep === 'signing' ? 'confirming' : 'sending'}
              to={recipient.address}
              toLabel={recipient.label}
              isPrivate={isPrivate}
            />
          )}
          <ProgressSteps kind="send" step={sendStep} />
          {snapshot.notice && <div className="sub">{snapshot.notice}</div>}
        </div>
      )}

      {step === 'sent' && recipient && (
        <>
          <div className="center">
            <SendFlow stage="landed" to={recipient.address} toLabel={recipient.label} isPrivate={isPrivate} />
            <div className="page-title">Sent {sent}{isPrivate ? ' privately' : ''}</div>
            <div className="sub">to {recipient.label ?? shortAddress(recipient.address)}</div>
            {fee !== null && token.status === 'ready' && (
              <div className="sub">Fee {feeLabel(fee, decimals, symbol)}</div>
            )}
            {snapshot.notice && <div className="sub">{snapshot.notice}</div>}
          </div>
          <div className="page-bottom stack">
            <button className="btn" onClick={tellThem}><Icon name="share" />Tell them</button>
            <button className="btn soft" onClick={onClose}>Done</button>
          </div>
        </>
      )}
    </Sheet>
  );
}

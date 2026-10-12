'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccountId } from '@miden-sdk/miden-sdk';
import { useTokenInfo } from '@/hooks/useTokenInfo';
import { accountAddress, shortAddress } from '@/lib/address';
import { confirmWithBiometrics, sendLock, type SendLock } from '@/lib/biometrics';
import { DEV_LOCAL_SIGNER } from '@/lib/devSigner';
import { alertRecipient } from '@/lib/alerts';
import { formatError } from '@/lib/errors';
import { feeLabel } from '@/lib/fees';
import { toHexAccountId } from '@/lib/helpers';
import { reportDiag } from '@/lib/remoteDiag';
import { canScanQr, haptic, onAppActiveChange, scanQr, shareText, telegramBiometrics } from '@/lib/telegram';
import { formatTokenAmount, parseTokenAmount } from '@/lib/tokenAmounts';
import { Icon } from './Icon';
import { ProgressSteps } from './ProgressSteps';
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
    title: 'Send from your phone',
    text: 'Every send is confirmed with Face ID or a fingerprint, so sending works in Telegram on your phone. Here you can see and receive.',
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
export function SendSheet({ open, prefill, onClose }: { open: boolean; prefill: string | null; onClose(): void }) {
  const { engine, snapshot } = useWallet();
  const amountInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('to');
  const [input, setInput] = useState('');
  const [recipient, setRecipient] = useState<{ hex: string; address: string } | null>(null);
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
  const pick = (value: string, { quiet = false } = {}): boolean => {
    try {
      setRecipient(parseRecipient(value, snapshot.accountId));
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

  const busy = step === 'sending';
  // Face ID runs before the engine starts: that is still "confirming it's you".
  const sendStep = snapshot.activity?.kind === 'send' ? snapshot.activity.step : 'preparing';
  // Telegram's back button (via the sheet) steps back to the recipient, then closes.
  const back = step === 'amount' ? () => setStep('to') : null;

  const scan = async () => {
    haptic('light');
    const text = await scanQr('Scan a Miden address', (value) => {
      try {
        parseRecipient(value, null);
        return true;
      } catch {
        return false;
      }
    });
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
    const go = async () => {
      const scan = SKIP_SCAN ? 'ok' : await confirmWithBiometrics(telegramBiometrics(), `Send ${label}`);
      if (scan !== 'ok') {
        setStep('amount');
        if (scan === 'failed') return fail('Not confirmed. Slide to try again.');
        setLock(scan);
        return;
      }
      const result = await engine.send(recipient.hex, faucetId, units, { private: isPrivate });
      alertRecipient(recipient.hex);
      setFee(result.fee);
      haptic('success');
      setStep('sent');
    };
    go().catch((e: unknown) => {
      reportDiag('send.error', e);
      setStep('amount');
      fail(formatError(e));
    });
  };

  // After a send: tell them in their chat, from your own account (you pick
  // the chat and press send). No link: their address may be in any Miden wallet.
  const tellThem = () => {
    haptic('light');
    void shareText(`Hi! I've sent you ${sent}${isPrivate ? ' privately' : ''}. Please claim it in your Miden wallet.`)
      .catch(() => undefined);
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
          <div className="done locked-icon"><Icon name="lock" /></div>
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

      {(!lock || lock === 'ok') && step === 'to' && (
        <>
          <div className="page-title">Send</div>
          <div className="field-wrap">
            <input
              className="field"
              placeholder="Miden address"
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
          {recents.length > 0 && (
            <div className="cells">
              <div className="cells-head">Recent</div>
              {recents.map((id) => (
                <button key={id} className="cell" onClick={() => pick(id)}>
                  <span className="avatar"><Icon name="user" /></span>
                  <span className="cell-main"><span className="cell-title mono-ish">{shortAddress(accountAddress(id))}</span></span>
                </button>
              ))}
            </div>
          )}
          <p className="error">{error}</p>
        </>
      )}

      {(!lock || lock === 'ok') && step === 'amount' && recipient && (
        <>
          <div className="page-title">To <span className="to-addr">{shortAddress(recipient.address)}</span></div>
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
            <SendFlow stage="landed" to={recipient.address} isPrivate={isPrivate} />
            <div className="page-title">Sent {sent}{isPrivate ? ' privately' : ''}</div>
            <div className="sub">to {shortAddress(recipient.address)}</div>
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

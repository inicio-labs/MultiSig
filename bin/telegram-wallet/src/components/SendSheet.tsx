'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AccountId } from '@miden-sdk/miden-sdk';
import { useTokenInfo } from '@/hooks/useTokenInfo';
import { accountAddress, shortAddress } from '@/lib/address';
import { confirmWithBiometrics } from '@/lib/biometrics';
import { formatError } from '@/lib/errors';
import { toHexAccountId } from '@/lib/helpers';
import { usePref } from '@/lib/prefs';
import { canScanQr, haptic, insideTelegram, scanQr, telegramBiometrics } from '@/lib/telegram';
import { formatTokenAmount, parseTokenAmount } from '@/lib/tokenAmounts';
import { Icon } from './Icon';
import { ProgressSteps } from './ProgressSteps';
import { RollingNumber } from './RollingNumber';
import { Sheet } from './Sheet';
import { SlideToSend } from './SlideToSend';
import { TokenSymbol } from './TokenAmount';
import { useWallet } from './WalletProvider';


type Step = 'to' | 'amount' | 'sending' | 'sent';

/**
 * Fees are paid in the fee token (USDCX on testnet), from the same balance, so
 * Max keeps 0.001 of it back: several times today's testnet fee (~0.00013).
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
  const [biometricSends] = usePref('biometricSends');

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
  // Telegram's back button (via the sheet) steps back to the recipient, then closes.
  const back = step === 'amount' ? () => setStep('to') : null;
  // Inside Telegram its own back button does this.
  const backArrow = back && !insideTelegram
    ? <button className="page-back" onClick={back} aria-label="Back"><Icon name="back" /></button>
    : null;

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

  const max = () => {
    if (!balance || token.status !== 'ready') return;
    const isFee = faucetId.toLowerCase() === snapshot.feeFaucetId;
    const value = isFee ? balance.amount - feeReserve(decimals) : balance.amount;
    setAmount(value > 0n ? formatTokenAmount(value, decimals) : '0');
    haptic('selection');
  };

  const send = () => {
    if (!recipient || !balance || token.status !== 'ready') return;
    let units: bigint;
    try {
      units = parseTokenAmount(amount || '0', decimals);
    } catch {
      return fail('Enter an amount');
    }
    if (units > balance.amount) return fail('That’s more than you have');
    setError(null);
    amountInput.current?.blur();
    setStep('sending');
    const label = `${formatTokenAmount(units, decimals)} ${symbol}`;
    setSent(label);
    // Face ID first, while the first step ("Confirming it’s you") shows.
    const go = async () => {
      if (!(await confirmWithBiometrics(telegramBiometrics(), { enabled: biometricSends !== false, reason: `Send ${label}` }))) {
        setStep('amount');
        return fail('Not confirmed. Slide to try again.');
      }
      await engine.send(recipient.hex, faucetId, units, { private: isPrivate });
      haptic('success');
      setStep('sent');
    };
    go().catch((e: unknown) => {
      setStep('amount');
      fail(formatError(e));
    });
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

      {step === 'to' && (
        <>
          <div className="page-title">{backArrow}Send</div>
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

      {step === 'amount' && recipient && (
        <>
          <div className="page-title">{backArrow}To <span className="to-addr">{shortAddress(recipient.address)}</span></div>
          <button key={shake} className={`amount${shake ? ' shake' : ''}`} onClick={() => amountInput.current?.focus()}>
            <RollingNumber value={amount || '0'} className="fast" />
            <span className="caret" />
            <small>{symbol}</small>
          </button>
          <div className="amount-meta">
            <button className="pill" onClick={max}>
              {balance && token.status === 'ready' ? `Balance ${formatTokenAmount(balance.amount, decimals)} · Max` : 'Max'}
            </button>
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
          <ProgressSteps kind="send" step={snapshot.activity?.kind === 'send' ? snapshot.activity.step : 'preparing'} />
          {snapshot.notice && <div className="sub">{snapshot.notice}</div>}
        </div>
      )}

      {step === 'sent' && recipient && (
        <>
          <div className="center">
            <div className="done"><Icon name="check" /></div>
            <div className="page-title">Sent {sent}{isPrivate ? ' privately' : ''}</div>
            <div className="sub">to {shortAddress(recipient.address)}</div>
            {snapshot.notice && <div className="sub">{snapshot.notice}</div>}
          </div>
          <div className="page-bottom"><button className="btn soft" onClick={onClose}>Done</button></div>
        </>
      )}
    </Sheet>
  );
}

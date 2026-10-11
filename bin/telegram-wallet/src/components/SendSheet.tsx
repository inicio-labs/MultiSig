'use client';

import { useEffect, useMemo, useState } from 'react';
import { AccountId } from '@miden-sdk/miden-sdk';
import { useTokenInfo } from '@/hooks/useTokenInfo';
import { accountAddress, shortAddress } from '@/lib/address';
import { formatError } from '@/lib/errors';
import { toHexAccountId } from '@/lib/helpers';
import { canScanQr, haptic, scanQr } from '@/lib/telegram';
import { formatTokenAmount, parseTokenAmount } from '@/lib/tokenAmounts';
import type { ActivityStep } from '@/lib/walletEngine';
import { Icon } from './Icon';
import { Keypad } from './Keypad';
import { Sheet } from './Sheet';
import { SlideToSend } from './SlideToSend';
import { TokenSymbol } from './TokenAmount';
import { useWallet } from './WalletProvider';

const STEP_LABEL: Record<ActivityStep, string> = {
  preparing: 'Getting ready',
  signing: 'Signing',
  proving: 'Sending to the network',
  syncing: 'Almost done',
};

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

export function SendSheet({ open, onClose, prefill }: { open: boolean; onClose(): void; prefill?: string | null }) {
  const { engine, snapshot } = useWallet();
  const [step, setStep] = useState<Step>('to');
  const [input, setInput] = useState('');
  const [recipient, setRecipient] = useState<{ hex: string; address: string } | null>(null);
  const [faucetId, setFaucetId] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [sent, setSent] = useState('');

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
      .slice(0, 3);
  }, [snapshot.history]);

  const fail = (message: string) => {
    setError(message);
    setShake((n) => n + 1);
    haptic('error');
  };

  const chooseRecipient = (value: string) => {
    setInput(value);
    try {
      setRecipient(parseRecipient(value, snapshot.accountId));
      setError(null);
      setStep('amount');
      haptic('light');
    } catch (e) {
      fail(formatError(e));
    }
  };

  // Each opening starts fresh; a pay link fills in the recipient.
  useEffect(() => {
    if (!open) return;
    const fee = balances.find((b) => b.faucetId.toLowerCase() === snapshot.feeFaucetId);
    setFaucetId((fee ?? balances[0])?.faucetId ?? '');
    setAmount('');
    setError(null);
    setRecipient(null);
    setInput(prefill ?? '');
    setStep('to');
    if (prefill) chooseRecipient(prefill);
    // Only on opening: later balance updates must not reset the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill]);

  // A complete, valid address moves on by itself, typed or pasted.
  const typed = (value: string) => {
    setInput(value);
    setError(null);
    try {
      setRecipient(parseRecipient(value, snapshot.accountId));
      setStep('amount');
      haptic('light');
    } catch { /* not a full address yet */ }
  };

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
    if (text) chooseRecipient(text);
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
    setStep('sending');
    setSent(`${formatTokenAmount(units, decimals)} ${symbol}`);
    engine.send(recipient.hex, faucetId, units).then(
      () => {
        haptic('success');
        setStep('sent');
      },
      (e: unknown) => {
        setStep('amount');
        fail(formatError(e));
      },
    );
  };

  const busy = step === 'sending';
  return (
    <Sheet open={open} onClose={onClose} onBack={step === 'amount' ? () => setStep('to') : undefined} locked={busy}>
      {step === 'to' && (
        <>
          <div className="sh-t">Send to</div>
          <div className="field-wrap">
            <input
              className="field"
              placeholder="Miden address"
              value={input}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              onChange={(e) => typed(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && chooseRecipient(input)}
            />
            {canScanQr() && (
              <button className="field-icon" onClick={scan} aria-label="Scan a QR code"><Icon name="scan" /></button>
            )}
          </div>
          {recents.length > 0 && (
            <>
              <div className="sec">Recent</div>
              <div className="list">
                {recents.map((id) => (
                  <button key={id} className="row" onClick={() => chooseRecipient(id)}>
                    <span className="ico"><Icon name="user" /></span>
                    <span className="t">{shortAddress(accountAddress(id))}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <p className="error">{error}</p>
        </>
      )}

      {step === 'amount' && recipient && (
        <>
          <div className="sh-t">To {shortAddress(recipient.address)}</div>
          {balances.length > 1 && (
            <div className="tokens">
              {balances.map((b) => (
                <button
                  key={b.faucetId}
                  className={`chip${b.faucetId === faucetId ? ' on' : ''}`}
                  onClick={() => { setFaucetId(b.faucetId); setAmount(''); haptic('selection'); }}
                >
                  <TokenSymbol faucetId={b.faucetId} />
                </button>
              ))}
            </div>
          )}
          <div key={shake} className={`amount${shake ? ' shake' : ''}`}>
            {amount || '0'} <small>{symbol}</small>
          </div>
          <div className="sub">
            {balance && token.status === 'ready' ? `You have ${formatTokenAmount(balance.amount, decimals)} ${symbol} · ` : ''}
            <button className="max" onClick={max}>Max</button>
          </div>
          <Keypad value={amount} decimals={decimals} onChange={(next) => { setAmount(next); setError(null); }} />
          <p className="error">{error}</p>
          <SlideToSend label="Slide to send" onSlide={send} />
        </>
      )}

      {step === 'sending' && (
        <div className="center" style={{ padding: '24px 0 32px' }}>
          <div className="sh-t">Sending {sent}</div>
          <div className="spinner" aria-hidden />
          <div className="sub">{STEP_LABEL[snapshot.activity?.step ?? 'preparing']}…</div>
          {snapshot.notice && <div className="sub">{snapshot.notice}</div>}
        </div>
      )}

      {step === 'sent' && recipient && (
        <>
          <div className="done"><Icon name="check" /></div>
          <div className="sh-t">Sent {sent}</div>
          <div className="sub">to {shortAddress(recipient.address)}</div>
          <button className="btn soft" style={{ marginTop: 8 }} onClick={onClose}>Done</button>
        </>
      )}
    </Sheet>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { AccountId } from '@miden-sdk/miden-sdk';
import type { VaultBalance } from '@openzeppelin/miden-multisig-client';
import { useTokenInfo } from '@/hooks/useTokenInfo';
import { accountAddress, shortAddress } from '@/lib/address';
import { formatError } from '@/lib/errors';
import { toHexAccountId } from '@/lib/helpers';
import { haptic } from '@/lib/telegram';
import { formatTokenAmount, parseTokenAmount } from '@/lib/tokenAmounts';
import type { ActivityStep } from '@/lib/walletEngine';
import { TokenSymbol } from './TokenAmount';
import { useWallet } from './WalletProvider';
import { BackLink } from './Splash';

const STEP_LABELS: Record<ActivityStep, string> = {
  preparing: 'Preparing',
  signing: 'Signing',
  proving: 'Proving the transaction',
  syncing: 'Updating your balance',
};
const STEPS = Object.keys(STEP_LABELS) as ActivityStep[];

interface Review {
  recipientHex: string;
  recipientAddress: string;
  faucetId: string;
  amount: bigint;
  display: string;
}

/**
 * Fees are paid in the fee token (USDCX on testnet), from the same balance, so
 * Max keeps a small reserve for it: 0.001 token, several times today's
 * testnet fee (about 0.00013 per transaction).
 */
function feeReserve(decimals: number): bigint {
  return 10n ** BigInt(Math.max(decimals - 3, 0));
}

function parseRecipient(input: string, ownId: string | null): { hex: string; address: string } {
  const value = input.trim();
  if (!value) throw new Error('Enter the recipient’s address.');
  let hex: string;
  try {
    hex = toHexAccountId(value);
    AccountId.fromHex(hex);
  } catch {
    throw new Error('This is not a valid Miden address.');
  }
  if (ownId && hex.toLowerCase() === ownId.toLowerCase()) throw new Error('This is your own address.');
  return { hex, address: accountAddress(hex) };
}

export function Send({ onDone, onBack }: { onDone(): void; onBack?: () => void }) {
  const { engine, snapshot } = useWallet();
  const balances = snapshot.balances;
  const [faucetId, setFaucetId] = useState(balances[0]?.faucetId ?? '');
  const [recipient, setRecipient] = useState('');
  const [amountText, setAmountText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [result, setResult] = useState<'sent' | null>(null);
  const balance: VaultBalance | undefined = balances.find((b) => b.faucetId === faucetId);
  const token = useTokenInfo(faucetId);
  const decimals = token.status === 'ready' ? token.info.decimals : null;
  const isFeeToken = faucetId.toLowerCase() === snapshot.feeFaucetId;

  const maxAmount = useMemo(() => {
    if (!balance || decimals === null) return null;
    const max = isFeeToken ? balance.amount - feeReserve(decimals) : balance.amount;
    return max > 0n ? max : 0n;
  }, [balance, decimals, isFeeToken]);

  const paste = async () => {
    try {
      setRecipient((await navigator.clipboard.readText()).trim());
    } catch {
      setError('Paste is not available here; type or long-press to paste.');
    }
  };

  const toReview = () => {
    setError(null);
    try {
      if (!balance || decimals === null || token.status !== 'ready') throw new Error('Choose a token.');
      const to = parseRecipient(recipient, snapshot.accountId);
      const amount = parseTokenAmount(amountText, decimals);
      if (amount > balance.amount) throw new Error('That is more than your balance.');
      setReview({
        recipientHex: to.hex,
        recipientAddress: to.address,
        faucetId,
        amount,
        display: `${formatTokenAmount(amount, decimals)} ${token.info.symbol}`,
      });
    } catch (e) {
      setError(formatError(e));
    }
  };

  const confirm = () => {
    if (!review) return;
    setError(null);
    engine.send(review.recipientHex, review.faucetId, review.amount).then(
      () => {
        haptic('success');
        setResult('sent');
      },
      (e: unknown) => {
        haptic('error');
        setError(formatError(e));
      },
    );
  };

  const activity = snapshot.activity?.kind === 'send' ? snapshot.activity : null;

  if (result === 'sent' && review) {
    return (
      <main className="screen">
        <div className="center">
          <div style={{ fontSize: 44 }} aria-hidden>✓</div>
          <h1 className="title">Sent {review.display}</h1>
          <p className="hint">to {shortAddress(review.recipientAddress)}</p>
          {snapshot.notice && <p className="hint">{snapshot.notice}</p>}
          <button className="btn" style={{ maxWidth: 260 }} onClick={onDone}>Done</button>
        </div>
      </main>
    );
  }

  if (activity && review) {
    const current = STEPS.indexOf(activity.step);
    return (
      <main className="screen">
        <div className="center">
          <div className="spinner" aria-hidden />
          <h1 className="title">Sending {review.display}</h1>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, textAlign: 'left', display: 'grid', gap: 6 }}>
            {STEPS.map((step, i) => (
              <li key={step} className={i === current ? undefined : 'hint'}>
                {i < current ? '✓' : i === current ? '•' : '○'} {STEP_LABELS[step]}
              </li>
            ))}
          </ol>
          {snapshot.notice && <p className="hint">{snapshot.notice}</p>}
        </div>
      </main>
    );
  }

  if (review) {
    return (
      <main className="screen">
        <h1 className="title">Review</h1>
        <section className="card" style={{ display: 'grid', gap: 12 }}>
          <div><div className="hint">You send</div><div style={{ fontSize: 24, fontWeight: 700 }}>{review.display}</div></div>
          <div><div className="hint">To</div><div className="mono">{review.recipientAddress}</div></div>
          <p className="hint" style={{ margin: 0 }}>Payments cannot be reversed. Check the address.</p>
        </section>
        {error && <p className="error">{error}</p>}
        <div style={{ marginTop: 'auto', display: 'grid', gap: 10 }}>
          <button className="btn" onClick={confirm}>Confirm and send</button>
          <button className="btn secondary" onClick={() => { setReview(null); setError(null); }}>Edit</button>
        </div>
      </main>
    );
  }

  return (
    <main className="screen">
      <BackLink onBack={onBack} />
      <h1 className="title">Send</h1>
      <div className="field">
        <label htmlFor="recipient">To</label>
        <div className="input-row">
          <input
            id="recipient"
            className="input mono"
            placeholder="mtst1…"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
          <button className="btn small secondary" onClick={paste}>Paste</button>
        </div>
      </div>

      {balances.length > 1 && (
        <div className="field">
          <label>Token</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {balances.map((b) => (
              <button
                key={b.faucetId}
                className={`btn small ${b.faucetId === faucetId ? '' : 'secondary'}`}
                onClick={() => { setFaucetId(b.faucetId); setAmountText(''); }}
              >
                <TokenSymbol faucetId={b.faucetId} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="field">
        <label htmlFor="amount">Amount</label>
        <div className="input-row">
          <input
            id="amount"
            className="input"
            inputMode="decimal"
            placeholder="0.0"
            autoComplete="off"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value.replace(',', '.'))}
          />
          <button
            className="btn small secondary"
            disabled={maxAmount === null || maxAmount === 0n}
            onClick={() => decimals !== null && maxAmount !== null && setAmountText(formatTokenAmount(maxAmount, decimals))}
          >
            Max
          </button>
        </div>
        <span className="hint">
          {balance && decimals !== null && token.status === 'ready'
            ? `Balance: ${formatTokenAmount(balance.amount, decimals)} ${token.info.symbol}`
            : token.status === 'error' ? token.error : '…'}
        </span>
      </div>

      {error && <p className="error">{error}</p>}
      <button className="btn" style={{ marginTop: 'auto' }} onClick={toReview} disabled={!recipient.trim() || !amountText.trim()}>
        Review
      </button>
    </main>
  );
}

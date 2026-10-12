'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { useTokenInfo } from '@/hooks/useTokenInfo';
import { watchDeviceTilt } from '@/lib/telegram';
import { formatTokenAmount } from '@/lib/tokenAmounts';
import { RollingNumber } from './RollingNumber';

/**
 * The wallet as a physical card, after Telegram's Gram wallet: the balance,
 * the owner's name embossed, the address along the edge. It tilts with the
 * phone (or the pointer) and the foil catches the light.
 */
export function WalletCard({ balance, name, address, loading, caption, hidden, celebration, onTap }: {
  balance: { faucetId: string; amount: bigint } | null;
  name: string | null;
  address: string;
  loading: boolean;
  /** In place of the wordmark, e.g. "Updated 2 min ago" while the balance is being refreshed. */
  caption?: string | null;
  /** Amounts blurred: hide amounts is on, or the app is in the background. */
  hidden: boolean;
  /** Money just landed: the card pulses and shows what came in. */
  celebration: { id: number; text: string } | null;
  onTap(): void;
}) {
  const card = useRef<HTMLDivElement>(null);
  const [pulse, setPulse] = useState<{ id: number; text: string } | null>(null);
  useEffect(() => {
    if (!celebration) return;
    setPulse(celebration);
    const timer = setTimeout(() => setPulse(null), 1700);
    return () => clearTimeout(timer);
  }, [celebration]);
  const target = useRef({ x: 0, y: 0 });

  // Ease toward the latest tilt every frame: sensors and pointers are jumpy.
  useEffect(() => {
    let frame = 0;
    const now = { x: 0, y: 0 };
    const tick = () => {
      now.x += (target.current.x - now.x) * 0.12;
      now.y += (target.current.y - now.y) * 0.12;
      card.current?.style.setProperty('--tx', now.x.toFixed(4));
      card.current?.style.setProperty('--ty', now.y.toFixed(4));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const stop = watchDeviceTilt((x, y) => { target.current = { x, y }; });
    return () => {
      cancelAnimationFrame(frame);
      stop();
    };
  }, []);

  const follow = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || !card.current) return;
    const r = card.current.getBoundingClientRect();
    target.current = {
      x: Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / (r.width / 2))),
      y: Math.max(-1, Math.min(1, (e.clientY - r.top - r.height / 2) / (r.height / 2))),
    };
  };

  return (
    <div className="card-scene" onPointerMove={follow} onPointerLeave={() => { target.current = { x: 0, y: 0 }; }}>
      <div
        // Not re-keyed on a pulse: remounting would lose the balance's digit roll.
        className={`card${hidden ? ' amounts-hidden' : ''}${pulse ? ' card-pulse' : ''}`}
        ref={card}
        onClick={onTap}
        role="button"
        aria-label="Copy your address"
      >
        <div className="card-grain" />
        <div className="card-shine" />
        <div className="card-sweep" />
        {pulse && <div className="card-plus amount-value">{pulse.text}</div>}
        <div className="card-balance amount-value">
          {loading || !balance ? (balance || loading ? <span className="shim" /> : <span>0</span>) : <CardAmount {...balance} />}
        </div>
        <div className="card-brand">{caption ?? 'miden'}</div>
        {name && <div className="card-name">{name}</div>}
        <div className="card-addr"><span>{address}</span></div>
      </div>
    </div>
  );
}

function CardAmount({ faucetId, amount }: { faucetId: string; amount: bigint }) {
  const token = useTokenInfo(faucetId);
  if (token.status !== 'ready') return <span className="shim" />;
  return (
    <>
      <RollingNumber value={formatTokenAmount(amount, token.info.decimals)} />
      <small>{token.info.symbol}</small>
    </>
  );
}

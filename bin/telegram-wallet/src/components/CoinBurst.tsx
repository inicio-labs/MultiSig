'use client';

import { useEffect, useRef } from 'react';

export interface Burst {
  id: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

const COINS = 8;
const FLIGHT_MS = 720;
const STAGGER_MS = 55;
/** When the first coins reach the card: the moment the balance rolls up. */
export const BURST_LANDS_MS = 620;

/**
 * Circle coins that arc from where the money was collected into the card.
 * Purely decorative: nothing waits for it, and it is skipped when the user
 * asked for reduced motion.
 */
export function CoinBurst({ burst }: { burst: Burst | null }) {
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = layer.current;
    if (!burst || !host || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const coins: HTMLElement[] = [];
    for (let i = 0; i < COINS; i++) {
      const coin = document.createElement('span');
      coin.className = 'coin';
      coin.style.left = `${burst.from.x - 12}px`;
      coin.style.top = `${burst.from.y - 12}px`;
      host.appendChild(coin);
      coins.push(coin);
      const spread = i - (COINS - 1) / 2;
      const dx = burst.to.x - burst.from.x + spread * 16;
      const dy = burst.to.y - burst.from.y;
      coin.animate(
        [
          { transform: 'translate(0, 0) scale(.5)', opacity: 0 },
          { transform: `translate(${spread * 30}px, ${dy * 0.45}px) scale(1.1)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${dx}px, ${dy}px) scale(.45)`, opacity: 0.1 },
        ],
        { duration: FLIGHT_MS, delay: i * STAGGER_MS, easing: 'cubic-bezier(.3, .1, .3, 1)', fill: 'forwards' },
      ).onfinish = () => coin.remove();
    }
    return () => coins.forEach((coin) => coin.remove());
  }, [burst]);

  return <div className="coin-layer" ref={layer} aria-hidden />;
}

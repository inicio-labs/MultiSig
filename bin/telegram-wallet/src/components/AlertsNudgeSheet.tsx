'use client';

import { Icon } from './Icon';
import { Sheet } from './Sheet';

/**
 * Payment alerts, asked once: after a collect (the first payment, usually).
 * Swiping it away or tapping outside is "Not now".
 */
export function AlertsNudgeSheet({ open, firstPayment, onAnswer }: {
  open: boolean;
  firstPayment: boolean;
  onAnswer(turnOn: boolean): void;
}) {
  return (
    <Sheet open={open} onClose={() => onAnswer(false)}>
      <div className="center nudge">
        <div className="nudge-icon"><Icon name="bell" /></div>
        <div className="page-title">{firstPayment ? 'Your first payment is in' : 'Know when money arrives'}</div>
        <div className="sub">Want a Telegram message next time someone pays you? Just a heads-up, never the amount.</div>
      </div>
      <button className="btn" onClick={() => onAnswer(true)}>Turn on alerts</button>
      <button className="text-btn" onClick={() => onAnswer(false)}>Not now</button>
    </Sheet>
  );
}

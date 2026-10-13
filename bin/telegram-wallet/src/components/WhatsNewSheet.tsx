'use client';

import { Icon } from './Icon';
import { Sheet } from './Sheet';

/**
 * "New in PrivPay", once, to people who already had a wallet: get paid by
 * @username. Says what it shares before the switch. Swiping it away is "Later".
 */
export function WhatsNewSheet({ open, username, onAnswer }: {
  open: boolean;
  username: string;
  onAnswer(turnOn: boolean): void;
}) {
  return (
    <Sheet open={open} onClose={() => onAnswer(false)}>
      <div className="center nudge">
        <span className="new-pill">New in PrivPay</span>
        <div className="nudge-icon"><Icon name="at" /></div>
        <div className="page-title">Get paid by @{username}</div>
        <div className="sub">Friends can pay you by typing your username, no address needed.</div>
        <div className="sub fine-center">Anyone who knows your username can find your address. Your balance and payments stay private.</div>
      </div>
      <button className="btn" onClick={() => onAnswer(true)}>Turn it on</button>
      <button className="text-btn" onClick={() => onAnswer(false)}>Later</button>
    </Sheet>
  );
}

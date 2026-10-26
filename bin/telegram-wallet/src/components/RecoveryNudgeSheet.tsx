'use client';

import { Icon } from './Icon';
import { useBiometricName } from './RecoverySheet';
import { Sheet } from './Sheet';

/**
 * Recovery, offered after a collect (the first payment, usually). Swiping it
 * away is "Later"; Receive, Send and Settings keep a quiet way back to it.
 */
export function RecoveryNudgeSheet({ open, firstPayment, onAnswer }: {
  open: boolean;
  firstPayment: boolean;
  onAnswer(setUp: boolean): void;
}) {
  const bio = useBiometricName();
  return (
    <Sheet open={open} onClose={() => onAnswer(false)}>
      <div className="center nudge">
        <div className="nudge-icon"><Icon name="lock" /></div>
        <div className="page-title">{firstPayment ? 'Your first payment is in' : 'Keep your money safe'}</div>
        <div className="sub">Right now your Telegram login is the only lock on this wallet. Add {bio} and a recovery email, so it takes more than your Telegram to spend it.</div>
        <div className="sub fine-center">About a minute · fee under 1¢ · needed to send once you have $20.</div>
      </div>
      <button className="btn" onClick={() => onAnswer(true)}>Set up recovery</button>
      <button className="text-btn" onClick={() => onAnswer(false)}>Later</button>
    </Sheet>
  );
}

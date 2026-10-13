'use client';

import { Icon } from './Icon';

export type FlowStage = 'confirming' | 'sending' | 'landed';

/**
 * The payment as a note travelling from you to them: it waits on your side
 * while you confirm, flies across for as long as the network works on it,
 * and lands on their side only once the payment is through. Sealed with a
 * lock when private. Still frames with reduced motion.
 */
export function SendFlow({ stage, to, toLabel, isPrivate }: { stage: FlowStage; to: string; toLabel?: string; isPrivate: boolean }) {
  return (
    <div className={`flow is-${stage}`} aria-hidden>
      <div className="flow-end">
        <span className="avatar"><Icon name="user" /></span>
        <span className="flow-label">You</span>
      </div>
      <div className="flow-track">
        {[0, 1, 2].map((i) => (
          <span key={i} className="flow-note" style={{ animationDelay: `${i * 0.55}s` }}>
            <Icon name={isPrivate ? 'lock' : 'arrow'} />
          </span>
        ))}
      </div>
      <div className="flow-end">
        <span className="avatar flow-to"><Icon name={stage === 'landed' ? 'check' : 'user'} /></span>
        <span className="flow-label">{toLabel ?? `…${to.slice(-4)}`}</span>
      </div>
    </div>
  );
}

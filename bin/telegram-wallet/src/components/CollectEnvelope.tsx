'use client';

import { forwardRef } from 'react';
import { TokenAmount } from './TokenAmount';

/** How long opening the envelope takes: always the same, at a person's pace. */
export const ENVELOPE_OPEN_MS = 3400;
/** The note sliding the rest of the way out once the payment is in. */
export const ENVELOPE_OUT_MS = 900;

/**
 * Collecting a private payment: an envelope picked up, its flap peeled open
 * and the note pulled out, the same pace every time. The note rests half out
 * until the payment is in (`out`), then slides free.
 */
export const CollectEnvelope = forwardRef<HTMLDivElement, {
  faucetId: string;
  amount: bigint;
  out: boolean;
  hidden: boolean;
}>(function CollectEnvelope({ faucetId, amount, out, hidden }, noteRef) {
  return (
    <div className="env-scene" aria-hidden>
      <div className="env">
        <div className="env-back" />
        <div ref={noteRef} className={`env-note${out ? ' is-out' : ''}${hidden ? ' amounts-hidden' : ''}`}>
          <div className="env-note-k">Private payment</div>
          <div className="env-note-v amount-value">+<TokenAmount faucetId={faucetId} amount={amount} /></div>
          <div className="env-note-lines"><span /><span /></div>
        </div>
        <svg className="env-front" viewBox="0 0 200 128">
          <path d="M0 10 Q0 0 10 0 L100 74 L10 128 Q0 128 0 118 Z" />
          <path d="M200 10 Q200 0 190 0 L100 74 L190 128 Q200 128 200 118 Z" />
          <path className="env-bottom" d="M0 118 L100 62 L200 118 Q200 128 190 128 L10 128 Q0 128 0 118 Z" />
        </svg>
        <svg className="env-flap" viewBox="0 0 200 82">
          <path d="M0 10 Q0 0 10 0 H190 Q200 0 200 10 L106 78 Q100 82 94 78 Z" />
        </svg>
      </div>
    </div>
  );
});

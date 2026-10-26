'use client';

import type { ActivityStep, WalletActivity } from '@/lib/walletEngine';
import { Icon } from './Icon';

/**
 * Two steps in everyday words: the engine's stages (preparing, signing,
 * proving, delivering, syncing) fold into "it's you" and "it's happening".
 */
const STEPS: Record<WalletActivity['kind'], Array<{ label: string; covers: ActivityStep[] }>> = {
  send: [
    { label: 'Confirming it’s you', covers: ['preparing', 'signing'] },
    { label: 'Sending it', covers: ['proving', 'delivering', 'syncing'] },
  ],
  claim: [
    { label: 'Confirming it’s you', covers: ['preparing', 'signing'] },
    { label: 'Adding it to your balance', covers: ['proving', 'delivering', 'syncing'] },
  ],
  recovery: [
    { label: 'Confirming it’s you', covers: ['preparing', 'signing'] },
    { label: 'Turning on recovery', covers: ['proving', 'delivering', 'syncing'] },
  ],
};

/** Where a send or collect is: done, now, next (`done`: every step ticked). */
export function ProgressSteps({ kind, step, done = false }: { kind: WalletActivity['kind']; step: ActivityStep; done?: boolean }) {
  const steps = STEPS[kind];
  const current = done ? steps.length : Math.max(0, steps.findIndex((s) => s.covers.includes(step)));
  return (
    <ol className="progress" aria-label="Progress">
      {steps.map(({ label }, i) => {
        const state = i < current ? 'done' : i === current ? 'now' : 'next';
        return (
          <li key={label} className={`progress-step is-${state}`} aria-current={state === 'now' ? 'step' : undefined}>
            <span className="progress-dot" aria-hidden>{state === 'done' && <Icon name="check" />}</span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

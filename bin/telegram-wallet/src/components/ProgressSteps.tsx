'use client';

import type { ActivityStep, WalletActivity } from '@/lib/walletEngine';
import { Icon } from './Icon';

/** The pipeline in everyday words: no "proposal", "proof" or "note". */
function stepsFor(kind: WalletActivity['kind'], isPrivate: boolean): Array<[ActivityStep, string]> {
  if (kind === 'claim') {
    return [
      ['preparing', 'Getting ready'],
      ['signing', 'Confirming it’s you'],
      ['proving', 'Locking it in'],
      ['syncing', 'Adding to your balance'],
    ];
  }
  return [
    ['preparing', 'Getting ready'],
    ['signing', 'Confirming it’s you'],
    ['proving', isPrivate ? 'Sending privately' : 'Sending'],
    ...(isPrivate ? [['delivering', 'Delivering privately'] as [ActivityStep, string]] : []),
    ['syncing', 'Updating your balance'],
  ];
}

/** Where a send or collect is, step by step: done, now, next. */
export function ProgressSteps({ kind, step, isPrivate = false }: {
  kind: WalletActivity['kind'];
  step: ActivityStep;
  isPrivate?: boolean;
}) {
  const steps = stepsFor(kind, isPrivate);
  const current = Math.max(0, steps.findIndex(([s]) => s === step));
  return (
    <ol className="progress" aria-label="Progress">
      {steps.map(([key, label], i) => {
        const state = i < current ? 'done' : i === current ? 'now' : 'next';
        return (
          <li key={key} className={`progress-step is-${state}`} aria-current={state === 'now' ? 'step' : undefined}>
            <span className="progress-dot" aria-hidden>{state === 'done' && <Icon name="check" />}</span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

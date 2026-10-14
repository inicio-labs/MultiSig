'use client';

import { useEffect, useState } from 'react';

/**
 * The Guardian session, for Settings to show: while active, reads and
 * proposal requests are signed by a key on this phone instead of the wallet.
 */
export type SessionStatus =
  | { state: 'off'; reason?: string }
  | { state: 'starting' }
  | { state: 'active'; expiresAt: number }
  | { state: 'ended'; reason: string };

let status: SessionStatus = { state: 'off' };
const listeners = new Set<(next: SessionStatus) => void>();

export function setSessionStatus(next: SessionStatus): void {
  status = next;
  for (const listener of listeners) listener(next);
}

export function useSessionStatus(): SessionStatus {
  const [current, setCurrent] = useState(status);
  useEffect(() => {
    listeners.add(setCurrent);
    setCurrent(status);
    return () => { listeners.delete(setCurrent); };
  }, []);
  return current;
}

/** expiresAt may come in seconds or milliseconds. */
export const expiryMs = (expiresAt: number): number => (expiresAt < 1e12 ? expiresAt * 1000 : expiresAt);

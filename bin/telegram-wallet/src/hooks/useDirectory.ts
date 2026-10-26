'use client';

import { directoryAvailable, startRegistration, unregister } from '@/lib/directory';
import { usePref } from '@/lib/prefs';
import { haptic, telegramUsername } from '@/lib/telegram';

/**
 * Pay-by-@username, for the switches in Receive and Settings (and the home
 * notice): on reopens the wallet from its registration link (Telegram signs
 * it; the home screen finishes it), off removes the entry at once and is
 * remembered, so it is not turned back on by itself.
 */
export function useDirectory(accountId: string | null) {
  const [on, setOn] = usePref('directory');
  const [, setOff] = usePref('directoryOff');
  const username = telegramUsername();
  const available = directoryAvailable() && accountId !== null;
  const set = (next: boolean) => {
    if (!accountId) return;
    if (!username) return haptic('error');
    setOff(!next);
    if (next) return startRegistration(accountId);
    setOn(false);
    void unregister();
  };
  return { available, username, on: on === true, set };
}

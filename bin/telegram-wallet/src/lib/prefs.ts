'use client';

import { useCallback, useEffect, useState } from 'react';
import { storage } from './storage';
import { telegramCloud } from './telegram';
import { VIEW_SCOPE } from './viewScope';

/**
 * The wallet's settings. Inside Telegram they live in Telegram's cloud
 * storage, so they follow the user to their other Telegram devices; outside
 * it (or on old clients), in this device's storage. Both are UI preferences:
 * nothing sensitive is ever stored this way.
 */
// Registrations (alerts, the directory) and one-time nudges belong to one
// network: on mainnet they live under their own names, so nothing carries
// over from testnet. Hide amounts and sound are the person's, kept as they are.
const NETWORK_PREFIX = VIEW_SCOPE.replace(/:$/, '_');
const perNetwork = (key: string) => `${NETWORK_PREFIX}${key}`;

export const PREFS = {
  hideAmounts: { key: 'hide_amounts', fallback: false },
  sound: { key: 'sound', fallback: true },
  // Payment alerts from the bot (alerts.ts); "asked" hides the home card once answered.
  alerts: { key: perNetwork('payment_alerts'), fallback: false },
  alertsAsked: { key: perNetwork('payment_alerts_asked'), fallback: false },
  // In the Telegram directory: friends can pay you by @username (directory.ts).
  directory: { key: perNetwork('directory'), fallback: false },
  // "New in PrivPay: get paid by @username", shown once to existing users.
  newUsernameSeen: { key: perNetwork('new_username_seen'), fallback: false },
} as const;

/** The testnet names of the per-network settings (removed on mainnet's fresh start). */
export const TESTNET_PREF_KEYS = ['payment_alerts', 'payment_alerts_asked', 'directory', 'new_username_seen'];

type PrefName = keyof typeof PREFS;

const LOCAL_PREFIX = 'miden-tg-wallet:pref:';
const listeners = new Map<PrefName, Set<(value: boolean) => void>>();
const cache = new Map<PrefName, boolean>();

// This device's copy, read at once on opening (Telegram's cloud answers a
// moment later): hide amounts must apply from the first frame.
function onDevice(name: PrefName): boolean | null {
  const raw = storage.get(LOCAL_PREFIX + PREFS[name].key);
  return raw === null ? null : raw === '1';
}

async function load(name: PrefName): Promise<boolean> {
  const { key, fallback } = PREFS[name];
  const cloud = telegramCloud();
  const raw = cloud ? await cloud.get(key) : storage.get(LOCAL_PREFIX + key);
  const value = raw === null ? (onDevice(name) ?? fallback) : raw === '1';
  storage.set(LOCAL_PREFIX + key, value ? '1' : '0');
  return value;
}

function save(name: PrefName, value: boolean): void {
  const { key } = PREFS[name];
  cache.set(name, value);
  for (const listener of listeners.get(name) ?? []) listener(value);
  storage.set(LOCAL_PREFIX + key, value ? '1' : '0');
  void telegramCloud()?.set(key, value ? '1' : '0');
}

/**
 * A setting, shared by every component that reads it: this device's copy at
 * first (or null), then Telegram's. `loaded` once Telegram's is in (decisions
 * that must not flash, like a one-time nudge, wait for it).
 */
export function usePref(name: PrefName): [boolean | null, (value: boolean) => void, boolean] {
  const [value, setValue] = useState<boolean | null>(cache.get(name) ?? onDevice(name));
  const [loaded, setLoaded] = useState(cache.has(name));
  useEffect(() => {
    const set = listeners.get(name) ?? new Set();
    listeners.set(name, set);
    const listener = (next: boolean) => { setValue(next); setLoaded(true); };
    set.add(listener);
    if (cache.has(name)) setLoaded(true);
    else {
      void load(name).then((value) => {
        if (!cache.has(name)) cache.set(name, value);
        const current = cache.get(name) as boolean;
        for (const each of set) each(current);
      });
    }
    return () => { set.delete(listener); };
  }, [name]);
  return [value, useCallback((next: boolean) => save(name, next), [name]), loaded];
}

/** The current value without subscribing (e.g. inside a sound helper). */
export function prefNow(name: PrefName): boolean {
  return cache.get(name) ?? PREFS[name].fallback;
}

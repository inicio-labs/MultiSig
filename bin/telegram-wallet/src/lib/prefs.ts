'use client';

import { useCallback, useEffect, useState } from 'react';
import { storage } from './storage';
import { telegramCloud } from './telegram';

/**
 * The wallet's settings. Inside Telegram they live in Telegram's cloud
 * storage, so they follow the user to their other Telegram devices; outside
 * it (or on old clients), in this device's storage. Both are UI preferences:
 * nothing sensitive is ever stored this way.
 */
export const PREFS = {
  hideAmounts: { key: 'hide_amounts', fallback: false },
  sound: { key: 'sound', fallback: true },
  // Face ID / fingerprint before each send, where the phone has it (biometrics.ts).
  biometricSends: { key: 'biometric_sends', fallback: true },
} as const;

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

/** A setting, shared by every component that reads it; `null` until loaded. */
export function usePref(name: PrefName): [boolean | null, (value: boolean) => void] {
  const [value, setValue] = useState<boolean | null>(cache.get(name) ?? onDevice(name));
  useEffect(() => {
    const set = listeners.get(name) ?? new Set();
    listeners.set(name, set);
    set.add(setValue);
    if (!cache.has(name)) {
      void load(name).then((loaded) => {
        if (!cache.has(name)) {
          cache.set(name, loaded);
          for (const listener of set) listener(loaded);
        }
      });
    }
    return () => { set.delete(setValue); };
  }, [name]);
  return [value, useCallback((next: boolean) => save(name, next), [name])];
}

/** The current value without subscribing (e.g. inside a sound helper). */
export function prefNow(name: PrefName): boolean {
  return cache.get(name) ?? PREFS[name].fallback;
}

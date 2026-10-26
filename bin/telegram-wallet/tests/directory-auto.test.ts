import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { autoJoinDue, lastAutoJoinAt, markAutoJoin, takeAutoJoin, type AutoJoinState } from '@/lib/directoryAuto';

describe('pay-by-username on by default', () => {
  const now = Date.UTC(2026, 9, 26, 12);
  const base: AutoJoinState = {
    on: false,
    off: false,
    loaded: true,
    hasUsername: true,
    available: true,
    openedFromLink: false,
    idle: true,
    lastTriedAt: null,
    now,
  };

  it('joins a wallet whose owner never turned it off', () => {
    expect(autoJoinDue(base)).toBe(true);
  });

  it('never turns it back on after its owner turned it off', () => {
    expect(autoJoinDue({ ...base, off: true })).toBe(false);
  });

  it('waits for the settings, and does nothing when already on', () => {
    expect(autoJoinDue({ ...base, loaded: false })).toBe(false);
    expect(autoJoinDue({ ...base, on: null })).toBe(false);
    expect(autoJoinDue({ ...base, on: true })).toBe(false);
  });

  it('skips people without a Telegram username, and builds without the directory', () => {
    expect(autoJoinDue({ ...base, hasUsername: false })).toBe(false);
    expect(autoJoinDue({ ...base, available: false })).toBe(false);
  });

  it('never interrupts: not when opened from a link, not while something is open or running', () => {
    expect(autoJoinDue({ ...base, openedFromLink: true })).toBe(false);
    expect(autoJoinDue({ ...base, idle: false })).toBe(false);
  });

  it('tries at most once a day', () => {
    expect(autoJoinDue({ ...base, lastTriedAt: now - 60 * 60 * 1000 })).toBe(false);
    expect(autoJoinDue({ ...base, lastTriedAt: now - 24 * 60 * 60 * 1000 })).toBe(true);
  });

  describe('across the reopen', () => {
    // These tests run without a browser: a small localStorage of their own.
    beforeEach(() => {
      const items = new Map<string, string>();
      (globalThis as { window?: unknown }).window = {
        localStorage: {
          getItem: (key: string) => items.get(key) ?? null,
          setItem: (key: string, value: string) => void items.set(key, value),
          removeItem: (key: string) => void items.delete(key),
        },
      };
    });
    afterEach(() => { delete (globalThis as { window?: unknown }).window; });

    it('remembers the try, and tells the reopened wallet once that it joined by itself', () => {
      expect(lastAutoJoinAt()).toBeNull();
      markAutoJoin(now);
      expect(lastAutoJoinAt()).toBe(now);
      expect(takeAutoJoin()).toBe(true);
      expect(takeAutoJoin()).toBe(false);
    });
  });
});

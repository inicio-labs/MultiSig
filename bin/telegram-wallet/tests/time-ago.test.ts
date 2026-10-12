import { describe, expect, it } from 'vitest';
import { timeAgo } from '@/lib/timeAgo';

describe('timeAgo', () => {
  const now = Date.parse('2026-10-12T12:00:00Z');
  it('says how long ago in plain words', () => {
    expect(timeAgo(now - 20_000, now)).toBe('just now');
    expect(timeAgo(now - 2 * 60_000, now)).toBe('2 min ago');
    expect(timeAgo(now - 3 * 3_600_000, now)).toBe('3 h ago');
    expect(timeAgo(now - 30 * 3_600_000, now)).toBe('yesterday');
    expect(timeAgo(now - 4 * 86_400_000, now)).toBe('4 days ago');
  });
});

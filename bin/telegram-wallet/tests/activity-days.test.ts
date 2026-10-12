import { describe, expect, it } from 'vitest';
import { dayLabel, groupByDay } from '@/lib/activityDays';

describe('activity day headers', () => {
  const now = new Date(2026, 9, 13, 10, 0).getTime(); // Tue 13 Oct 2026, 10:00 local
  const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h).getTime();

  it('names days the way Telegram does, by the local calendar', () => {
    expect(dayLabel(at(2026, 9, 13, 0), now, 'en-GB')).toBe('Today');
    expect(dayLabel(at(2026, 9, 12, 23), now, 'en-GB')).toBe('Yesterday');
    expect(dayLabel(at(2026, 9, 10), now, 'en-GB')).toBe('Saturday');
    expect(dayLabel(at(2026, 9, 5), now, 'en-GB')).toBe('Mon 5 Oct');
    expect(dayLabel(at(2025, 9, 6), now, 'en-GB')).toBe('6 Oct 2025');
    expect(dayLabel(Number.NaN, now, 'en-GB')).toBe('Earlier');
  });

  it('keeps items in order under their day', () => {
    const items = [at(2026, 9, 13, 9), at(2026, 9, 13, 8), at(2026, 9, 12), at(2026, 9, 5)];
    const groups = groupByDay(items, (t) => t, now);
    expect(groups.map((g) => g.items.length)).toEqual([2, 1, 1]);
    expect(groups.map((g) => g.label).slice(0, 2)).toEqual(['Today', 'Yesterday']);
    expect(groups[2].label).toMatch(/Mon.*(5 Oct|Oct 5)/);
  });
});

/**
 * Day headers and times for the activity list, as Telegram and iOS show them:
 * "Today", "Yesterday", the weekday within a week, then "Mon, 6 Oct" ("6 Oct
 * 2025" in another year). By the phone's calendar day, in its local time.
 * Light on purpose: the instant first paint (InstantPreview) uses it too.
 */
const DAY_MS = 86_400_000;

// The labels are English, like the rest of the app; dates follow the phone's
// English variant (en-US "Oct 6", en-GB "6 Oct"), else British English.
function dateLocale(): string {
  const language = typeof navigator === 'undefined' ? '' : navigator.language;
  return language.toLowerCase().startsWith('en') ? language : 'en-GB';
}

function startOfDay(ms: number): number {
  const date = new Date(ms);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** The day header for a payment at `ts` (ms); "Earlier" when its time is unknown. */
export function dayLabel(ts: number, now = Date.now(), locale = dateLocale()): string {
  if (!Number.isFinite(ts)) return 'Earlier';
  // Rounded: a day around a clock change is 23 or 25 hours long.
  const days = Math.round((startOfDay(now) - startOfDay(ts)) / DAY_MS);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  const date = new Date(ts);
  if (days < 7) return date.toLocaleDateString(locale, { weekday: 'long' });
  if (date.getFullYear() === new Date(now).getFullYear()) {
    return date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  }
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "14:32" or "2:32 PM", as the phone tells time; empty when unknown. */
export function timeOfDay(ts: number): string {
  if (!Number.isFinite(ts)) return '';
  const hourCycle = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle;
  return new Intl.DateTimeFormat(dateLocale(), { hour: 'numeric', minute: '2-digit', hourCycle }).format(ts);
}

/** Newest-first items under their day headers, in order. */
export function groupByDay<T>(items: T[], timeOf: (item: T) => number, now = Date.now()): Array<{ label: string; items: T[] }> {
  const groups: Array<{ label: string; items: T[] }> = [];
  for (const item of items) {
    const label = dayLabel(timeOf(item), now);
    const last = groups.at(-1);
    if (last?.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

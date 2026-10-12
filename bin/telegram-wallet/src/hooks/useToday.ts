'use client';

import { useEffect, useState } from 'react';
import { onAppActiveChange } from '@/lib/telegram';

/** Now, refreshed at midnight and when the app comes back: "Today" moves on with the calendar. */
export function useToday(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const midnight = new Date(now);
    midnight.setHours(24, 0, 1, 0);
    const timer = setTimeout(() => setNow(Date.now()), midnight.getTime() - now);
    return () => clearTimeout(timer);
  }, [now]);
  useEffect(() => onAppActiveChange((active) => { if (active) setNow(Date.now()); }), []);
  return now;
}

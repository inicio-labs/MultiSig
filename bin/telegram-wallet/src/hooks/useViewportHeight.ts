'use client';

import { useEffect, useState } from 'react';
import { onViewportChange, viewportHeight } from '@/lib/telegram';

/** The height the app may use right now: it shrinks while the keyboard is up. */
export function useViewportHeight(): number {
  const [height, setHeight] = useState(viewportHeight);
  useEffect(() => onViewportChange(() => setHeight(viewportHeight())), []);
  return height;
}

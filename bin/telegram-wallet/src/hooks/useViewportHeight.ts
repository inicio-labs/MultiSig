'use client';

import { useEffect, useState } from 'react';
import { onViewportChange } from '@/lib/telegram';

export interface KeyboardFrame {
  /** How far the keyboard (or anything else) covers the bottom of the page, in px. */
  inset: number;
  /** The height left visible above it. */
  visible: number;
}

function measure(): KeyboardFrame {
  const vv = window.visualViewport;
  if (!vv) return { inset: 0, visible: window.innerHeight };
  // iOS keeps the layout viewport and shrinks only the visual one when the
  // keyboard opens; Android webviews shrink both (inset 0, smaller page).
  return { inset: Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)), visible: Math.round(vv.height) };
}

/** Where the keyboard is: a sheet sits on top of it instead of behind it. */
export function useKeyboardFrame(): KeyboardFrame {
  const [frame, setFrame] = useState(measure);
  useEffect(() => onViewportChange(() => setFrame(measure())), []);
  return frame;
}

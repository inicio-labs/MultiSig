'use client';

import { useEffect, useState } from 'react';
import { onViewportChange } from '@/lib/telegram';

export interface KeyboardFrame {
  /** How far the keyboard (or anything else) covers the bottom of the page, in px. */
  inset: number;
  /** The height left visible above it. */
  visible: number;
}

// An invisible full-height fixed box: its height is the area `position: fixed`
// elements are placed in, which on iOS is not always window.innerHeight while
// the keyboard is up.
let probe: HTMLDivElement | null = null;
function fixedAreaHeight(): number {
  if (!probe) {
    probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:fixed;top:0;bottom:0;left:0;width:0;visibility:hidden;pointer-events:none';
    document.body.appendChild(probe);
  }
  return probe.getBoundingClientRect().height;
}

function measure(): KeyboardFrame {
  const vv = window.visualViewport;
  if (!vv) return { inset: 0, visible: window.innerHeight };
  // iOS keeps the fixed area and shrinks only the visible one when the
  // keyboard opens, and also scrolls the visible one down (offsetTop) to show
  // the focused field: a sheet sits on the keyboard only when lifted by both.
  // Android webviews shrink everything (inset 0, smaller page).
  return {
    inset: Math.max(0, Math.round(fixedAreaHeight() - vv.height - vv.offsetTop)),
    visible: Math.round(vv.height),
  };
}

/** Where the keyboard is: a sheet sits on top of it instead of behind it. */
export function useKeyboardFrame(): KeyboardFrame {
  const [frame, setFrame] = useState(measure);
  useEffect(() => onViewportChange(() => {
    const next = measure();
    setFrame((prev) => (prev.inset === next.inset && prev.visible === next.visible ? prev : next));
  }), []);
  return frame;
}

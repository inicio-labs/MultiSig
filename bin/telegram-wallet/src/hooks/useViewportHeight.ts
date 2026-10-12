'use client';

import { useEffect, useState } from 'react';
import { onViewportChange } from '@/lib/telegram';

export interface KeyboardFrame {
  /** How far the keyboard covers the bottom of the page, in px (0 where the page itself shrinks). */
  inset: number;
  /** The height left visible above it. */
  visible: number;
  /** The keyboard is up, whether it covers the page or shrinks it. */
  open: boolean;
}

// The page shrinking by more than this means a keyboard, not browser chrome.
const KEYBOARD_MIN_PX = 150;
// Telegram on iOS and Android shrinks the page for the keyboard, in steps: the
// visible area first, the page a moment later. Measure again once it settles.
const SETTLE_MS = [60, 250, 600, 1200];

// An invisible full-height fixed box: its height is the area `position: fixed`
// elements are placed in.
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

// The tallest the page has been at this width: the height with no keyboard.
let tallest = { width: 0, height: 0 };

function measure(): KeyboardFrame {
  const vv = window.visualViewport;
  if (!vv) return { inset: 0, visible: window.innerHeight, open: false };
  if (window.innerWidth !== tallest.width) tallest = { width: window.innerWidth, height: 0 };
  tallest.height = Math.max(tallest.height, window.innerHeight, vv.height);
  // Safari-style keyboards cover the page: the fixed area keeps its height and
  // only the visible part shrinks (and may scroll, offsetTop). Telegram shrinks
  // the page instead, and then both are equal: nothing to lift.
  const inset = Math.max(0, Math.round(fixedAreaHeight() - vv.height - vv.offsetTop));
  return {
    inset,
    visible: Math.round(vv.height),
    open: inset > 0 || tallest.height - vv.height > KEYBOARD_MIN_PX,
  };
}

/** Where the keyboard is: a sheet sits on top of it instead of behind it. */
export function useKeyboardFrame(): KeyboardFrame {
  const [frame, setFrame] = useState(measure);
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const update = () => {
      const next = measure();
      setFrame((prev) => (prev.inset === next.inset && prev.visible === next.visible && prev.open === next.open ? prev : next));
    };
    const changed = () => {
      update();
      timers.splice(0).forEach(clearTimeout);
      for (const ms of SETTLE_MS) timers.push(setTimeout(update, ms));
    };
    const stop = onViewportChange(changed);
    // A field gaining or losing focus is the keyboard about to move.
    document.addEventListener('focusin', changed);
    document.addEventListener('focusout', changed);
    return () => {
      stop();
      document.removeEventListener('focusin', changed);
      document.removeEventListener('focusout', changed);
      timers.forEach(clearTimeout);
    };
  }, []);
  return frame;
}

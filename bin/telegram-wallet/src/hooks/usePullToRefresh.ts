'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { haptic } from '@/lib/telegram';

// Pull distance (after damping) that triggers a refresh.
const TRIGGER_PX = 48;
const MAX_PX = 90;
// A finger wobbles a few pixels either way before it really moves: decide
// pull or scroll only past this, so a scroll is never blocked by mistake.
const DECIDE_PX = 8;

/**
 * Pull down from the top of the page to refresh. Works because the app turns
 * off Telegram's own swipe-down-to-close (setupTelegramChrome). Touch events,
 * not pointer events: the browser would cancel pointers once it starts panning.
 */
export function usePullToRefresh(target: RefObject<HTMLElement | null>, indicator: RefObject<HTMLElement | null>, onRefresh: () => void) {
  const latest = useRef(onRefresh);
  latest.current = onRefresh;

  useEffect(() => {
    const el = target.current;
    if (!el) return;
    let startY: number | null = null;
    let startX = 0;
    // Undecided until the finger moves DECIDE_PX; a scroll is left alone to the end.
    let mode: 'undecided' | 'pull' | 'scroll' = 'undecided';
    let pulled = 0;
    const show = (px: number, animate: boolean) => {
      el.style.transition = animate ? '' : 'none';
      el.style.transform = px ? `translateY(${px}px)` : '';
      if (indicator.current) indicator.current.style.opacity = String(Math.min(1, px / TRIGGER_PX));
    };
    const start = (e: TouchEvent) => {
      startY = window.scrollY <= 0 && e.touches.length === 1 ? e.touches[0].clientY : null;
      startX = e.touches[0].clientX;
      mode = 'undecided';
      pulled = 0;
    };
    const move = (e: TouchEvent) => {
      if (startY === null || mode === 'scroll') return;
      const dy = e.touches[0].clientY - startY;
      const dx = e.touches[0].clientX - startX;
      if (mode === 'undecided') {
        if (Math.abs(dy) < DECIDE_PX && Math.abs(dx) < DECIDE_PX) return;
        // Only a clear downward drag at the very top is a pull; anything else
        // is the page's own scroll.
        mode = dy > 0 && dy > Math.abs(dx) && window.scrollY <= 0 ? 'pull' : 'scroll';
        if (mode === 'scroll') return;
      }
      if (dy <= 0) {
        show(0, false);
        pulled = 0;
        return;
      }
      if (e.cancelable) e.preventDefault();
      const next = Math.min(MAX_PX, dy * 0.5);
      if (pulled < TRIGGER_PX && next >= TRIGGER_PX) haptic('light');
      pulled = next;
      show(pulled, false);
    };
    const end = () => {
      if (startY === null) return;
      startY = null;
      if (mode !== 'pull') return;
      if (pulled >= TRIGGER_PX) latest.current();
      show(0, true);
    };
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
    };
  }, [target, indicator]);
}

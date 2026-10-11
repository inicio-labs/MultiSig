'use client';

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { useKeyboardFrame } from '@/hooks/useViewportHeight';
import { haptic, useTelegramBackButton } from '@/lib/telegram';

// A downward drag past this many pixels dismisses the sheet.
const DISMISS_PX = 90;

/**
 * A bottom sheet: it rises into the thumb zone, and closes with a swipe down
 * on its handle, a tap outside, or Telegram's back button (`onBack`, for a
 * step back inside the sheet, else close).
 */
export function Sheet({ open, onClose, onBack, locked = false, aboveKeyboard = false, children }: {
  open: boolean;
  onClose(): void;
  onBack?: () => void;
  /** While a transaction runs: no dismissing. */
  locked?: boolean;
  /** Ride on top of the phone's keyboard while it is open. */
  aboveKeyboard?: boolean;
  children: ReactNode;
}) {
  const keyboard = useKeyboardFrame();
  const sheet = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  useTelegramBackButton(open && !locked ? (onBack ?? onClose) : null);
  // Keep the content through the closing slide; unmounting then resets it.
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const timer = setTimeout(() => setMounted(false), 320);
    return () => clearTimeout(timer);
  }, [open]);

  const down = (e: PointerEvent) => {
    if (locked) return;
    startY.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (sheet.current) sheet.current.style.transition = 'none';
  };
  const move = (e: PointerEvent) => {
    if (startY.current === null || !sheet.current) return;
    sheet.current.style.transform = `translateY(${Math.max(0, e.clientY - startY.current)}px)`;
  };
  const up = (e: PointerEvent) => {
    if (startY.current === null || !sheet.current) return;
    const dragged = e.clientY - startY.current;
    startY.current = null;
    sheet.current.style.transition = '';
    sheet.current.style.transform = '';
    if (dragged > DISMISS_PX) {
      haptic('soft');
      onClose();
    }
  };

  return (
    <>
      <div className={`scrim${open ? ' on' : ''}`} onClick={() => !locked && onClose()} />
      <div
        ref={sheet}
        className={`sheet${open ? ' on' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        style={aboveKeyboard && keyboard.inset > 0
          ? { bottom: keyboard.inset, maxHeight: keyboard.visible - 12, paddingBottom: 14 }
          : undefined}
      >
        <div className="grab" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <div className="handle" />
        </div>
        {mounted && children}
      </div>
    </>
  );
}

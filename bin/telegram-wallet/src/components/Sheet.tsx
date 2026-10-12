'use client';

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { useKeyboardFrame } from '@/hooks/useViewportHeight';
import { reportDiag } from '@/lib/remoteDiag';
import { haptic, useTelegramBackButton, viewportHeight } from '@/lib/telegram';
import { Icon } from './Icon';

// A downward drag past this many pixels dismisses the sheet.
const DISMISS_PX = 90;

/**
 * A bottom sheet: it rises into the thumb zone, and closes with a swipe down
 * on its handle, a tap outside, its own back/close button, or Telegram's back
 * button (`onBack`, for a step back inside the sheet, else close).
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

  const onKeyboard = aboveKeyboard && keyboard.open;
  const back = onBack ?? onClose;
  // Test phones only (remoteDiag): where the keyboard and the sheet ended up.
  useEffect(() => {
    if (!open || !aboveKeyboard) return;
    const timer = setTimeout(() => {
      const vv = window.visualViewport;
      const rect = sheet.current?.getBoundingClientRect();
      reportDiag('keyboard', JSON.stringify({
        inset: keyboard.inset, visible: keyboard.visible, open: keyboard.open, innerHeight: window.innerHeight,
        clientHeight: document.documentElement.clientHeight, vvHeight: vv?.height, vvOffsetTop: vv?.offsetTop,
        scrollY: window.scrollY, telegramViewport: viewportHeight(),
        sheetTop: rect?.top, sheetBottom: rect?.bottom, sheetScroll: sheet.current?.scrollTop,
        sheetContent: sheet.current?.scrollHeight, focused: (document.activeElement as HTMLElement | null)?.className,
      }));
    }, 700);
    return () => clearTimeout(timer);
  }, [open, aboveKeyboard, keyboard.inset, keyboard.visible, keyboard.open]);

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
        className={`sheet${open ? ' on' : ''}${onKeyboard ? ' on-keyboard' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        style={onKeyboard ? { bottom: keyboard.inset, maxHeight: keyboard.visible - 8, paddingBottom: 12 } : undefined}
      >
        <div className="grab" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <div className="handle" />
        </div>
        {/* Back where the thumb can reach it, not only in Telegram's header. */}
        {mounted && !locked && (
          <button className="sheet-nav" onClick={() => { haptic('light'); back(); }} aria-label={onBack ? 'Back' : 'Close'}>
            <Icon name={onBack ? 'back' : 'close'} />
          </button>
        )}
        {mounted && children}
      </div>
    </>
  );
}

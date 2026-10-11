'use client';

import { useRef, type PointerEvent } from 'react';
import { haptic } from '@/lib/telegram';
import { Icon } from './Icon';

const KNOB = 62;
// The knob must travel this share of the track to count.
const THRESHOLD = 0.85;

/**
 * A deliberate swipe instead of a tap: signing is silent, so this is the one
 * confirmation before money moves, and a stray tap cannot trigger it.
 */
export function SlideToSend({ label, onSlide }: { label: string; onSlide(): void }) {
  const track = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; max: number } | null>(null);

  const place = (dx: number, animate: boolean) => {
    knob.current?.classList.toggle('back', animate);
    fill.current?.classList.toggle('back', animate);
    if (knob.current) knob.current.style.left = `${5 + dx}px`;
    if (fill.current) fill.current.style.width = `${KNOB + dx}px`;
  };
  const down = (e: PointerEvent) => {
    if (!track.current) return;
    start.current = { x: e.clientX, max: track.current.clientWidth - KNOB };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    haptic('light');
  };
  const move = (e: PointerEvent) => {
    if (!start.current) return;
    place(Math.max(0, Math.min(start.current.max, e.clientX - start.current.x)), false);
  };
  const up = (e: PointerEvent) => {
    if (!start.current) return;
    const { x, max } = start.current;
    start.current = null;
    if (e.clientX - x >= max * THRESHOLD) {
      haptic('heavy');
      place(max, false);
      onSlide();
    }
    place(0, true);
  };

  return (
    <div className="slide" ref={track}>
      <div className="fill" ref={fill} />
      <div className="lab">{label}</div>
      <div className="knob" ref={knob} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} role="button" aria-label={label}>
        <Icon name="arrow" />
      </div>
    </div>
  );
}

'use client';

import { prefNow } from './prefs';

/**
 * The receive sounds, synthesized (no audio files): a soft tick when a payment
 * arrives and a short chime when it is collected.
 *
 * Browsers only let a page play sound once the user has touched it, so the
 * audio is unlocked on the first touch; a tick before that stays silent.
 * Where supported, the session is "ambient" so the phone's silent switch
 * mutes it.
 */
let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (!prefNow('sound')) return null;
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session && session.type !== 'ambient') session.type = 'ambient';
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context ??= new Ctor();
    if (context.state === 'suspended') void context.resume();
    return context.state === 'running' ? context : null;
  } catch {
    return null;
  }
}

/** Unlock audio on the first touch, so a later arrival tick can play. */
export function unlockSoundOnFirstTouch(): () => void {
  const unlock = () => {
    audio();
    window.removeEventListener('pointerdown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  return () => window.removeEventListener('pointerdown', unlock);
}

function tone(ctx: AudioContext, frequency: number, at: number, length: number, volume: number, type: OscillatorType) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const start = ctx.currentTime + at;
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + length + 0.05);
}

/** A payment arrived. */
export function playTick(): void {
  const ctx = audio();
  if (ctx) tone(ctx, 1568, 0, 0.18, 0.08, 'sine');
}

/** Money collected: three rising notes and a sparkle. */
export function playChime(): void {
  const ctx = audio();
  if (!ctx) return;
  ([[988, 0], [1319, 0.08], [1976, 0.17]] as const).forEach(([f, t]) => tone(ctx, f, t, 0.45, 0.14, 'triangle'));
  [0.32, 0.38, 0.44].forEach((t, i) => tone(ctx, 2637 + i * 220, t, 0.12, 0.04, 'sine'));
}

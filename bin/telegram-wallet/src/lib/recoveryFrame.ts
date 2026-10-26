import type { Hex } from 'viem';
import { DEV_LOCAL_SIGNER } from './devSigner';

/**
 * The recovery email box: a page on its own origin (one origin holds one
 * Privy session, so the Telegram login keeps its own) embedded in the
 * wallet. It draws only the field (email, then the 6-digit code); the
 * wallet's sheet owns the title, errors and the main button. They talk by
 * origin-checked postMessage:
 *
 *   box → wallet  { type: 'state', … }        what the field shows, for the sheet
 *                 { type: 'email-key', … }    the email key, once signed in
 *                 { type: 'signed', id, … }   a signature the wallet asked for
 *   wallet → box  { type: 'submit' }          the sheet's main button
 *                 { type: 'resend' } | { type: 'change' }
 *                 { type: 'send-to', email }  the code to a known email (a new phone)
 *                 { type: 'sign', id, hash }
 *
 * Development builds embed a stand-in (same origin, a local key, any
 * 6-digit code), since Privy refuses localhost.
 */

export const RECOVER_ORIGIN = (process.env.NEXT_PUBLIC_RECOVER_ORIGIN || 'https://privpay-recover.forkchoice.xyz').replace(/\/$/, '');
export const APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_ORIGIN || 'https://privpay.forkchoice.xyz').replace(/\/$/, '');

/** The box's page: `?recovery-email=1` (Privy), `?recovery-email=dev` (development stand-in). */
export function recoveryEmailPage(): 'privy' | 'dev' | null {
  if (typeof window === 'undefined' || window.parent === window) return null;
  const mode = new URLSearchParams(window.location.search).get('recovery-email');
  if (mode === 'dev') return DEV_LOCAL_SIGNER ? 'dev' : null;
  return mode === '1' ? 'privy' : null;
}

/** Where the wallet embeds the box from, and the origin its messages must come from. */
export function recoveryEmailSource(): { src: string; origin: string } {
  if (DEV_LOCAL_SIGNER) return { src: `${window.location.origin}/?recovery-email=dev`, origin: window.location.origin };
  return { src: `${RECOVER_ORIGIN}/?recovery-email=1`, origin: RECOVER_ORIGIN };
}

/** The only origin the box takes requests from. */
export function walletOrigin(): string {
  return DEV_LOCAL_SIGNER ? window.location.origin : APP_ORIGIN;
}

export type EmailBoxStep = 'loading' | 'email' | 'code' | 'creating' | 'ready';

export interface EmailBoxState {
  step: EmailBoxStep;
  /** The field holds something the main button can act on. */
  valid: boolean;
  busy: boolean;
  error: string | null;
  /** The address the code went to (code step and after). */
  email: string | null;
  /** On the code step after a reload: the code sent before can no longer be used. */
  stale: boolean;
  height: number;
}

export type BoxMessage =
  | ({ type: 'state' } & EmailBoxState)
  | { type: 'email-key'; address: string; publicKey: Hex; email: string }
  | { type: 'signed'; id: number; signature?: string; error?: string };

export type WalletMessage =
  | { type: 'submit' }
  | { type: 'resend' }
  | { type: 'change' }
  | { type: 'send-to'; email: string }
  | { type: 'sign'; id: number; hash: Hex };

export const looksLikeEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
export const isSixDigits = (value: string): boolean => /^\d{6}$/.test(value);

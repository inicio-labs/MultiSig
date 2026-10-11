'use client';

/**
 * Development only: send errors to this app's own server log (api/diag), to
 * debug on a test phone without copying text off it. Off unless
 * NEXT_PUBLIC_REMOTE_DIAGNOSTICS=1. Sends error messages, stacks and the
 * browser's user agent; never keys, tokens or launch data.
 */
const ENABLED = process.env.NEXT_PUBLIC_REMOTE_DIAGNOSTICS === '1';

export function reportDiag(kind: string, detail: unknown): void {
  if (!ENABLED) return;
  const text = detail instanceof Error ? `${detail.message}\n${detail.stack ?? ''}` : String(detail);
  const body = JSON.stringify({ kind, text: text.slice(0, 4_000), ua: navigator.userAgent });
  void fetch('/api/diag', { method: 'POST', body, keepalive: true }).catch(() => undefined);
}

export function installRemoteDiag(): void {
  if (!ENABLED) return;
  window.addEventListener('error', (e) => reportDiag('window.error', e.error ?? e.message));
  window.addEventListener('unhandledrejection', (e) => reportDiag('unhandledrejection', e.reason));
  reportDiag('boot', 'app loaded');
}

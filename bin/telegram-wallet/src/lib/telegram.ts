'use client';

import { useEffect, useRef } from 'react';

interface TelegramWebApp {
  initData: string;
  initDataUnsafe?: { start_param?: string; user?: { first_name?: string; last_name?: string } };
  viewportHeight?: number;
  DeviceOrientation?: {
    start(params: { refresh_rate?: number }, callback?: (started: boolean) => void): void;
    stop(callback?: () => void): void;
    beta: number | null;
    gamma: number | null;
  };
  onEvent?(event: string, handler: () => void): void;
  offEvent?(event: string, handler: () => void): void;
  version: string;
  colorScheme?: 'light' | 'dark';
  isVersionAtLeast?(version: string): boolean;
  ready(): void;
  expand(): void;
  disableVerticalSwipes?(): void;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
  setBottomBarColor?(color: string): void;
  enableClosingConfirmation?(): void;
  disableClosingConfirmation?(): void;
  showScanQrPopup?(params: { text?: string }, callback: (text: string) => boolean | void): void;
  BackButton?: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void };
  HapticFeedback?: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };
  openTelegramLink?(url: string): void;
}

function webApp(): TelegramWebApp | undefined {
  return (window as Window & { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
}

// Read at module load, before Privy consumes the launch URL (it strips
// tgWebAppData), and kept only in this page's memory: never log, persist or
// send it anywhere. Privy verifies it for login; we only need to know it exists
// and to put it back for a retry.
const launchUrl = new URL(window.location.href);
const launchData =
  webApp()?.initData ||
  new URLSearchParams(launchUrl.hash.slice(1)).get('tgWebAppData') ||
  launchUrl.searchParams.get('tgWebAppData') ||
  '';

/** Opened from Telegram (bot menu button, link or inline button). */
export const insideTelegram = launchData !== '';

/**
 * Load Telegram's official bridge before Privy mounts, only inside a mini app:
 * Privy's seamless login reads WebApp.initData, not just the URL hash.
 */
export async function initializeTelegramBridge(): Promise<void> {
  if (!insideTelegram || webApp()) return;
  await new Promise<void>((resolve) => {
    const script = document.createElement('script');
    const timer = setTimeout(resolve, 8_000);
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    script.src = 'https://telegram.org/js/telegram-web-app.js';
    script.onload = done;
    script.onerror = done;
    document.head.appendChild(script);
  });
}

function supports(app: TelegramWebApp, version: string): boolean {
  return app.isVersionAtLeast?.(version) ?? false;
}

/** The app's one theme (globals.css): Telegram's header and bars take its background. */
const APP_BACKGROUND = '#fff7f1';

/**
 * Full height, Telegram's header and bars in the app's colour, and no
 * swipe-down-to-close: the app uses that gesture for pull-to-refresh and
 * for dismissing sheets.
 */
export function setupTelegramChrome(): void {
  const app = webApp();
  if (!app) return;
  app.ready();
  app.expand();
  if (supports(app, '6.1')) {
    app.setHeaderColor?.(APP_BACKGROUND);
    app.setBackgroundColor?.(APP_BACKGROUND);
  }
  if (supports(app, '7.10')) app.setBottomBarColor?.(APP_BACKGROUND);
  if (supports(app, '7.7')) app.disableVerticalSwipes?.();
}

/** The `startapp` parameter of the link that opened the app (t.me/bot/app?startapp=…). */
export function telegramStartParam(): string | null {
  return webApp()?.initDataUnsafe?.start_param
    || new URLSearchParams(launchData).get('start_param')
    || launchUrl.searchParams.get('tgWebAppStartParam')
    || null;
}

/** Ask before closing while a transaction is in flight. */
export function setClosingConfirmation(on: boolean): void {
  const app = webApp();
  if (!app || !supports(app, '6.2')) return;
  if (on) app.enableClosingConfirmation?.();
  else app.disableClosingConfirmation?.();
}

export const canScanQr = (): boolean => {
  const app = webApp();
  return Boolean(app?.showScanQrPopup && supports(app, '6.4'));
};

/** Telegram's own QR scanner; resolves with the first scanned text, or null if closed. */
export function scanQr(prompt: string, accept: (text: string) => boolean): Promise<string | null> {
  const app = webApp();
  return new Promise((resolve) => {
    if (!app?.showScanQrPopup) {
      resolve(null);
      return;
    }
    let done = false;
    app.showScanQrPopup({ text: prompt }, (text) => {
      if (done || !accept(text)) return false;
      done = true;
      resolve(text);
      return true;
    });
  });
}

/**
 * Restore the launch data for a user-requested login retry. Telegram's
 * auth_date is checked server-side, so an old launch cannot be replayed:
 * then the user has to reopen the mini app.
 */
export function prepareTelegramRetry(now = Date.now()): string | null {
  const authDate = Number(new URLSearchParams(launchData).get('auth_date'));
  if (!launchData || !authDate || now / 1000 - authDate > 300 || authDate > now / 1000 + 30) {
    return 'Your Telegram session has expired. Close the mini app and open it again from the bot.';
  }
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.slice(1));
  hash.delete('tgWebAppData');
  url.hash = `tgWebAppData=${encodeURIComponent(launchData)}${hash.size ? `&${hash}` : ''}`;
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  return null;
}

/** Telegram's native back button while `onBack` is set; hidden otherwise. */
export function useTelegramBackButton(onBack: (() => void) | null): void {
  const latest = useRef(onBack);
  latest.current = onBack;
  const visible = onBack !== null;
  useEffect(() => {
    const button = webApp()?.BackButton;
    if (!button || !visible) return;
    const handler = () => latest.current?.();
    button.onClick(handler);
    button.show();
    return () => {
      button.offClick(handler);
      button.hide();
    };
  }, [visible]);
}

type Haptic = 'light' | 'medium' | 'heavy' | 'soft' | 'selection' | 'success' | 'error' | 'warning';

/** Telegram's haptics: impacts for touches, selection for keypad ticks, notifications for outcomes. */
export function haptic(kind: Haptic): void {
  const feedback = webApp()?.HapticFeedback;
  if (!feedback) return;
  if (kind === 'selection') feedback.selectionChanged();
  else if (kind === 'success' || kind === 'error' || kind === 'warning') feedback.notificationOccurred(kind);
  else feedback.impactOccurred(kind);
}

/** Share into a Telegram chat with the chat picker; the system share sheet elsewhere. */
export async function shareLink(url: string, text: string): Promise<void> {
  const app = webApp();
  if (app?.openTelegramLink) {
    app.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
    return;
  }
  if (navigator.share) {
    await navigator.share({ text, url });
    return;
  }
  await navigator.clipboard.writeText(`${text} ${url}`);
}

/** The Telegram user's name, for the card. Display only: never used to identify anyone. */
export function telegramUserName(): string | null {
  const user = webApp()?.initDataUnsafe?.user;
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
  return name || null;
}

/** The height left for the app: Telegram's viewport, or the visual viewport (minus the keyboard). */
export function viewportHeight(): number {
  return webApp()?.viewportHeight || window.visualViewport?.height || window.innerHeight;
}

/** Calls `onChange` when the viewport height changes (keyboard, expand). */
export function onViewportChange(onChange: () => void): () => void {
  const app = webApp();
  app?.onEvent?.('viewportChanged', onChange);
  window.visualViewport?.addEventListener('resize', onChange);
  return () => {
    app?.offEvent?.('viewportChanged', onChange);
    window.visualViewport?.removeEventListener('resize', onChange);
  };
}

/**
 * The phone's tilt, as -1…1 on each axis relative to how it was held when this
 * started. Telegram's own sensor API inside Telegram (Bot API 8.0), else the
 * browser's where it needs no permission prompt. Returns a stop function;
 * calls nothing where neither exists (the card then follows the pointer).
 */
export function watchDeviceTilt(onTilt: (x: number, y: number) => void): () => void {
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  let base: { beta: number; gamma: number } | null = null;
  const report = (beta: number, gamma: number, range: number) => {
    base ??= { beta, gamma };
    onTilt(clamp((gamma - base.gamma) / range), clamp((beta - base.beta) / range));
  };

  const app = webApp();
  const sensor = app?.DeviceOrientation;
  if (app && sensor && supports(app, '8.0')) {
    // Radians.
    const handler = () => {
      if (sensor.beta !== null && sensor.gamma !== null) report(sensor.beta, sensor.gamma, 0.45);
    };
    sensor.start({ refresh_rate: 50 });
    app.onEvent?.('deviceOrientationChanged', handler);
    return () => {
      app.offEvent?.('deviceOrientationChanged', handler);
      sensor.stop();
    };
  }
  const needsPermission = typeof (window.DeviceOrientationEvent as unknown as { requestPermission?: unknown })?.requestPermission === 'function';
  if (typeof window.DeviceOrientationEvent === 'undefined' || needsPermission) return () => undefined;
  // Degrees.
  const handler = (e: DeviceOrientationEvent) => {
    if (e.beta !== null && e.gamma !== null) report(e.beta, e.gamma, 25);
  };
  window.addEventListener('deviceorientation', handler);
  return () => window.removeEventListener('deviceorientation', handler);
}

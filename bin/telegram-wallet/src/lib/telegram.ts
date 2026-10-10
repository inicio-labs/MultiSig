'use client';

import { useEffect, useRef } from 'react';

interface TelegramWebApp {
  initData: string;
  version: string;
  colorScheme?: 'light' | 'dark';
  isVersionAtLeast?(version: string): boolean;
  ready(): void;
  expand(): void;
  disableVerticalSwipes?(): void;
  BackButton?: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void };
  HapticFeedback?: { notificationOccurred(type: 'error' | 'success' | 'warning'): void };
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

/** Full height, and no swipe-down-to-close while the user scrolls or types an amount. */
export function setupTelegramChrome(): void {
  const app = webApp();
  if (!app) return;
  app.ready();
  app.expand();
  if (supports(app, '7.7')) app.disableVerticalSwipes?.();
}

export function telegramColorScheme(): 'light' | 'dark' {
  return webApp()?.colorScheme ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
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

export function haptic(type: 'error' | 'success' | 'warning'): void {
  webApp()?.HapticFeedback?.notificationOccurred(type);
}

/** Share via Telegram's chat picker inside Telegram; the system share sheet elsewhere. */
export async function shareText(text: string): Promise<void> {
  const app = webApp();
  if (app?.openTelegramLink) {
    app.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(text)}`);
    return;
  }
  if (navigator.share) {
    await navigator.share({ text });
    return;
  }
  await navigator.clipboard.writeText(text);
}

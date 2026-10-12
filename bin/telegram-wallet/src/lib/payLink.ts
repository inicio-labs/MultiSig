// A link that opens this wallet with Send filled in for `address`:
// https://t.me/<bot>/<app>?startapp=pay_<address>. Telegram allows
// A-Z a-z 0-9 _ - in start parameters, which covers Miden addresses.
const APP_URL = process.env.NEXT_PUBLIC_TELEGRAM_APP_URL?.trim() || '';
const PREFIX = 'pay_';

export function payLink(address: string): string | null {
  if (!APP_URL || !/^[A-Za-z0-9_-]+$/.test(address)) return null;
  return `${APP_URL}${APP_URL.includes('?') ? '&' : '?'}startapp=${PREFIX}${address}`;
}

/** A link that opens this wallet on Receive, to collect a payment someone just sent. */
export function collectLink(): string | null {
  return APP_URL ? `${APP_URL}${APP_URL.includes('?') ? '&' : '?'}startapp=collect` : null;
}

export const isCollectLink = (startParam: string | null): boolean => startParam === 'collect';

/** The address a pay link carries, from the app's start parameter. */
export function payLinkAddress(startParam: string | null): string | null {
  return startParam?.startsWith(PREFIX) ? startParam.slice(PREFIX.length) : null;
}

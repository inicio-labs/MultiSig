/**
 * Pure logic for the two hidden test pages (PasskeyCheck, PrivyPasskeyTest).
 * Nothing here is reachable by a normal user: the pages open only from
 * their query or start parameters.
 */

/** The passkey check: `startapp=passkey_check` in Telegram, `?passkey_check=1` anywhere, or the Settings flag. */
export function passkeyCheckRequested({ startParam, search, flag }: {
  startParam: string | null;
  search: string;
  flag: boolean;
}): boolean {
  return startParam === 'passkey_check' || new URLSearchParams(search).get('passkey_check') === '1' || flag;
}

/** The Privy passkey-MFA test: `?privy_passkey_test=1`. */
export function privyPasskeyTestRequested(search: string): boolean {
  return new URLSearchParams(search).get('privy_passkey_test') === '1';
}

/**
 * Which browser a page runs in, from what it can see. Telegram's mini app
 * webview carries launch data (`initData`) or its bridge object; on iOS a
 * plain in-app webview (WKWebView, e.g. Telegram's own link browser) has no
 * "Safari/" token in its user agent, while Safari and the in-app Safari view
 * (SFSafariViewController) do.
 */
export function browserKind({ userAgent, initData, telegramBridge }: {
  userAgent: string;
  initData: string;
  telegramBridge: boolean;
}): string {
  if (initData) return 'Telegram mini app webview (launch data present)';
  if (telegramBridge) return 'Telegram webview (bridge present, no launch data)';
  const ios = /iPhone|iPad|iPod/.test(userAgent);
  if (ios) {
    if (/CriOS\//.test(userAgent)) return 'Chrome on iOS';
    if (/FxiOS\//.test(userAgent)) return 'Firefox on iOS';
    if (/EdgiOS\//.test(userAgent)) return 'Edge on iOS';
    if (/Telegram/i.test(userAgent)) return 'Telegram in-app browser (user agent says Telegram)';
    if (/Version\/[\d.]+.*Safari\//.test(userAgent)) return 'Safari or the in-app Safari view (cannot tell apart)';
    return 'In-app webview (no Safari token: likely Telegram\'s own browser)';
  }
  if (/Android/.test(userAgent)) {
    if (/; wv\)/.test(userAgent)) return 'Android in-app webview';
    if (/Telegram/i.test(userAgent)) return 'Telegram in-app browser (user agent says Telegram)';
    return 'Android browser';
  }
  return 'Desktop browser';
}

/** The parts of a Privy user the MFA test checks before enrolling anything. */
export interface TestAccountView {
  email: string | null;
  linkedTypes: string[];
}

/**
 * Why the Privy MFA test must not enroll this account, or null when it may:
 * only a throwaway account signed in by email, never one linked to Telegram
 * (that is a real wallet user, and a passkey requirement would lock their
 * wallet inside Telegram, where passkeys do not work).
 */
export function refuseEnrollReason(user: TestAccountView | null): string | null {
  if (!user) return 'Not signed in.';
  if (user.linkedTypes.includes('telegram')) {
    return 'This Privy account is linked to Telegram: it is a real wallet account. The test refuses to touch it. Log out and sign in with a throwaway email.';
  }
  if (!user.email) return 'This Privy account has no email login. Sign in with a throwaway email account.';
  const foreign = user.linkedTypes.filter((t) => !['email', 'wallet', 'passkey'].includes(t));
  if (foreign.length > 0) {
    return `This Privy account has other logins linked (${foreign.join(', ')}). Use a fresh throwaway email account.`;
  }
  return null;
}

/** The Telegram openLink variants the passkey check offers (Bot API: options 6.4+, try_browser 7.6+). */
export interface OpenLinkVariant {
  label: string;
  options?: { try_instant_view?: boolean; try_browser?: string };
  minVersion: string;
}

export const OPEN_LINK_VARIANTS: OpenLinkVariant[] = [
  { label: 'openLink(url)', minVersion: '6.1' },
  { label: 'openLink(url, { try_instant_view: true })', options: { try_instant_view: true }, minVersion: '6.4' },
  { label: "openLink(url, { try_browser: 'chrome' })", options: { try_browser: 'chrome' }, minVersion: '7.6' },
];

/** The passkey check's own URL on this site, for Telegram to open in a browser. */
export function passkeyCheckUrl(origin: string): string {
  return `${origin}/?passkey_check=1`;
}

/** Results as plain text for "Copy results". */
export function resultsText(lines: { step: string; result: string }[]): string {
  return lines.map((l) => `${l.step}: ${l.result}`).join('\n');
}


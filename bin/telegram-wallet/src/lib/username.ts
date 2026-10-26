/**
 * A Telegram username typed in "To", with or without the @ ("@alex" or
 * "alex"): Telegram's rule, a letter then letters, digits or underscores,
 * 4 to 32 in all (4: Telegram's collectible names). Never an address being typed (mm1…, mtst1…, 0x…).
 */
export function usernameIn(typed: string): string | null {
  const name = typed.replace(/^@/, '');
  if (!/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(name)) return null;
  if (!typed.startsWith('@') && /^(mm1|mtst1)/i.test(name)) return null;
  return `@${name}`;
}

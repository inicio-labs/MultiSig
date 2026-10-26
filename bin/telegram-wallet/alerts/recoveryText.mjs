// Recovery news for the wallet's own Telegram user (no emoji, so it reads the
// same in every client). Facts first; nothing can be undone from here yet, so
// no "Cancel" or "Block", only what to secure if it wasn't them.

const escape = (value) => String(value).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

const PLATFORMS = { ios: 'iPhone', android: 'Android phone', android_x: 'Android phone' };

const NOT_YOU = 'someone has your Telegram and your email. Change your email password now, '
  + 'and end other sessions in Telegram › Settings › Devices.';

/**
 * The message for one recovery event, as Telegram HTML, or null for an
 * unknown event. `email` is already masked by the wallet (v•••@gmail.com);
 * `when` is the wallet's local time ("Today at 14:32").
 */
export function recoveryText(event, { email = '', platform = '', when = '' } = {}) {
  const masked = escape(email.slice(0, 80));
  const phone = PLATFORMS[platform] ?? 'phone';
  const at = escape(when.slice(0, 40));
  switch (event) {
    case 'phone-added':
      return [
        '<b>A new phone was added to your PrivPay wallet</b>',
        `${at ? `${at} · ` : ''}${phone}${masked ? ` · approved with your recovery email ${masked}` : ''}.`,
        'Your other phone can no longer send.',
        '',
        'If this was you, there’s nothing to do.',
        `If it wasn’t, ${NOT_YOU}`,
      ].join('\n');
    case 'set-up':
      return [
        '<b>Recovery was set up for your PrivPay wallet</b>',
        `${at ? `${at} · ` : ''}${phone}${masked ? ` · recovery email ${masked}` : ''}.`,
        '',
        'If this was you, there’s nothing to do.',
        'If it wasn’t, someone has your Telegram. End other sessions in Telegram › Settings › Devices now.',
      ].join('\n');
    case 'email-changed':
      return [
        '<b>Your PrivPay recovery email was changed</b>',
        `${at ? `${at} · ` : ''}${masked ? `New recovery email ${masked}.` : ''}`,
        '',
        'If this was you, there’s nothing to do.',
        `If it wasn’t, ${NOT_YOU}`,
      ].join('\n');
    default:
      return null;
  }
}

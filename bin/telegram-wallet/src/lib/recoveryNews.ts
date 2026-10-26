import { postToServer } from './privpayServer';
import { telegramPlatform } from './telegram';

/**
 * Recovery news in the user's chat with the bot (alerts/recoveryText.mjs):
 * recovery set up, a new phone added. Only the user's own Telegram gets it,
 * and only if they allowed messages; best effort, never in the way.
 */
export function tellRecoveryNews(event: 'set-up' | 'phone-added' | 'email-changed', maskedEmail: string): void {
  const time = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  void postToServer('/recovery/event', {
    event,
    email: maskedEmail,
    platform: telegramPlatform(),
    when: `Today at ${time}`,
  });
}

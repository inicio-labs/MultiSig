import { requestTelegramWriteAccess, telegramInitData } from './telegram';

/**
 * Payment alerts: the bot messages a user when someone pays them from this
 * wallet ("You received a private payment", never the amount). The user opts
 * in, which links their address to their Telegram account on our alerts
 * server (alerts/index.mjs); after a send, the sender's wallet asks the server
 * to alert the recipient. Every request carries Telegram's signed launch data.
 */
import { postToServer, SERVER_URL } from './privpayServer';

const call = async (path: string, body: Record<string, string>): Promise<boolean> => (await postToServer(path, body)) !== null;

/** Alerts can work here: inside Telegram, with the server configured. */
export const alertsAvailable = (): boolean => Boolean(SERVER_URL) && telegramInitData() !== null;


/** Telegram asks the user to let the bot message them; then the address is linked. */
export async function turnOnAlerts(accountId: string): Promise<boolean> {
  if (!(await requestTelegramWriteAccess())) return false;
  return call('/register', { address: accountId });
}

/** Linked again on each open (cheap), so a moved or new wallet stays reachable. */
export const refreshAlerts = (accountId: string): Promise<boolean> => call('/register', { address: accountId });

export const turnOffAlerts = (accountId: string): Promise<boolean> => call('/unregister', { address: accountId });

/** After a send: ask for the recipient to be alerted (if they turned alerts on). */
export function alertRecipient(accountId: string): void {
  void call('/notify', { to: accountId });
}

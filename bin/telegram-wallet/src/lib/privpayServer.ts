import { reportDiag } from './remoteDiag';
import { telegramInitData } from './telegram';

/** The PrivPay server (alerts/: payment alerts and the Telegram directory). */
export const SERVER_URL = (process.env.NEXT_PUBLIC_ALERTS_URL ?? '').trim().replace(/\/$/, '');

/**
 * POST with Telegram's signed launch data (how the server knows who asks).
 * The JSON answer, or null when it failed or there is no server or Telegram.
 */
export async function postToServer(path: string, body: Record<string, string>): Promise<Record<string, unknown> | null> {
  const initData = telegramInitData();
  if (!SERVER_URL || !initData) return null;
  try {
    const response = await fetch(`${SERVER_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...body, initData }),
    });
    if (!response.ok) {
      reportDiag('server', `${path}: ${response.status}`);
      return null;
    }
    return await response.json() as Record<string, unknown>;
  } catch (error) {
    reportDiag('server', error);
    return null;
  }
}

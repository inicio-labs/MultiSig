// PrivPay payment alerts (AWS Lambda, function URL). A wallet that opts in
// registers its address for its Telegram user; after a send, the sender's
// wallet asks for the recipient to be alerted, and the bot messages them:
// no amount, nothing about the payment beyond "you received one".
// Every request carries Telegram's signed launch data (verify.mjs).
import { DeleteItemCommand, DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { verifyInitData } from './verify.mjs';

const { TABLE, BOT_TOKEN, OPEN_URL } = process.env;
const db = new DynamoDBClient({});
// A Miden account id, as the wallet writes it.
const ACCOUNT_ID = /^0x[0-9a-f]{20,64}$/;
// Alerts one sender can trigger per hour (a payment is one).
const ALERTS_PER_HOUR = 30;
const ALERT_TEXT = 'You received a private payment. Open your wallet to collect it.';

const reply = (status, body) => ({ statusCode: status, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

async function sendAlert(chatId) {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: ALERT_TEXT,
      reply_markup: { inline_keyboard: [[{ text: 'Open wallet', url: OPEN_URL }]] },
    }),
  });
  // 403: the user blocked the bot or never allowed messages. Nothing to do.
  if (!response.ok && response.status !== 403) console.warn('sendMessage failed', response.status);
}

export async function handler(event) {
  if (event.requestContext?.http?.method !== 'POST') return reply(405, { error: 'POST only' });
  let body;
  try {
    body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body ?? '', 'base64').toString() : event.body ?? '');
  } catch {
    return reply(400, { error: 'bad json' });
  }
  const userId = verifyInitData(body.initData, BOT_TOKEN);
  if (!userId) return reply(401, { error: 'not a Telegram user of this bot' });

  switch (event.rawPath) {
    case '/register': {
      const address = String(body.address ?? '').toLowerCase();
      if (!ACCOUNT_ID.test(address)) return reply(400, { error: 'bad address' });
      await db.send(new PutItemCommand({
        TableName: TABLE,
        Item: { pk: { S: `acct#${address}` }, userId: { S: userId }, updatedAt: { N: String(Date.now()) } },
      }));
      return reply(200, { ok: true });
    }
    case '/unregister': {
      const address = String(body.address ?? '').toLowerCase();
      if (!ACCOUNT_ID.test(address)) return reply(400, { error: 'bad address' });
      await db.send(new DeleteItemCommand({
        TableName: TABLE,
        Key: { pk: { S: `acct#${address}` } },
        // Only the user who registered it.
        ConditionExpression: 'userId = :u',
        ExpressionAttributeValues: { ':u': { S: userId } },
      })).catch((error) => { if (error.name !== 'ConditionalCheckFailedException') throw error; });
      return reply(200, { ok: true });
    }
    case '/notify': {
      const to = String(body.to ?? '').toLowerCase();
      if (!ACCOUNT_ID.test(to)) return reply(400, { error: 'bad address' });
      const hour = Math.floor(Date.now() / 3_600_000);
      const counted = await db.send(new UpdateItemCommand({
        TableName: TABLE,
        Key: { pk: { S: `rate#${userId}#${hour}` } },
        UpdateExpression: 'ADD n :one SET #ttl = :ttl',
        ExpressionAttributeNames: { '#ttl': 'ttl' },
        ExpressionAttributeValues: { ':one': { N: '1' }, ':ttl': { N: String((hour + 2) * 3600) } },
        ReturnValues: 'UPDATED_NEW',
      }));
      if (Number(counted.Attributes?.n?.N ?? 0) > ALERTS_PER_HOUR) return reply(429, { error: 'too many' });
      const found = await db.send(new GetItemCommand({ TableName: TABLE, Key: { pk: { S: `acct#${to}` } } }));
      const recipient = found.Item?.userId?.S;
      if (recipient && recipient !== userId) await sendAlert(recipient);
      // The same answer either way: whether an address has alerts on is not anyone's business.
      return reply(200, { ok: true });
    }
    default:
      return reply(404, { error: 'not found' });
  }
}

// PrivPay server (AWS Lambda, function URL): payment alerts and the
// Telegram directory ("pay @username").
//
// Alerts: a wallet that opts in
// registers its address for its Telegram user; after a send, the sender's
// wallet asks for the recipient to be alerted, and the bot messages them:
// no amount, nothing about the payment beyond "you received one".
// Directory: a wallet that opts in stores a proof signed by Telegram that its
// user registered its address (reg_<address> start parameter, Ed25519); payers
// fetch the proof and check Telegram's signature on their own phone, so this
// server can withhold or serve an old entry but never forge one.
// Recovery news: the wallet's security events (recovery set up, a new phone
// added), sent only to the Telegram user who asks, i.e. the wallet's owner.
// Every request carries Telegram's signed launch data (verify.mjs).
import { DeleteItemCommand, DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { recoveryText } from './recoveryText.mjs';
import { readDirectoryProof, verifyInitData } from './verify.mjs';

const { TABLE, BOT_TOKEN, OPEN_URL } = process.env;
// The bot's id: the part of its token before the colon (public).
const BOT_ID = (BOT_TOKEN ?? '').split(':')[0];
// Directory lookups one user can make per hour.
const LOOKUPS_PER_HOUR = 60;
const db = new DynamoDBClient({});
// A Miden account id, as the wallet writes it.
const ACCOUNT_ID = /^0x[0-9a-f]{20,64}$/;
// Alerts one sender can trigger per hour (a payment is one).
const ALERTS_PER_HOUR = 30;
const ALERT_TEXT = 'You received a private payment. Open your wallet to collect it.';
// Recovery messages one user can trigger per hour.
const RECOVERY_PER_HOUR = 10;
// The mini app's link without its start parameter.
const APP_LINK = (OPEN_URL ?? '').replace(/\?.*$/, '');

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

async function sendRecoveryNews(chatId, text) {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: 'Open PrivPay', url: APP_LINK },
          { text: 'This wasn’t me', url: `${APP_LINK}?startapp=not_me` },
        ]],
      },
    }),
  });
  // 403: messages not allowed (asked during setup). Best effort.
  if (!response.ok && response.status !== 403) console.warn('recovery sendMessage failed', response.status);
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
  // Which launch-data fields this Telegram app sends (names only, never values):
  // the directory needs Telegram's Ed25519 "signature" field.
  console.log('initData fields', [...new URLSearchParams(String(body.initData ?? '')).keys()].sort().join(','));
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
    case '/recovery/event': {
      const text = recoveryText(String(body.event ?? ''), {
        email: String(body.email ?? ''),
        platform: String(body.platform ?? ''),
        when: String(body.when ?? ''),
      });
      if (!text) return reply(400, { error: 'unknown event' });
      const hour = Math.floor(Date.now() / 3_600_000);
      const counted = await db.send(new UpdateItemCommand({
        TableName: TABLE,
        Key: { pk: { S: `recov#${userId}#${hour}` } },
        UpdateExpression: 'ADD n :one SET #ttl = :ttl',
        ExpressionAttributeNames: { '#ttl': 'ttl' },
        ExpressionAttributeValues: { ':one': { N: '1' }, ':ttl': { N: String((hour + 2) * 3600) } },
        ReturnValues: 'UPDATED_NEW',
      }));
      if (Number(counted.Attributes?.n?.N ?? 0) > RECOVERY_PER_HOUR) return reply(429, { error: 'too many' });
      // Only ever to the user who asks: their own wallet's news.
      await sendRecoveryNews(userId, text);
      return reply(200, { ok: true });
    }
    case '/directory/register': {
      // The request's own launch data is the proof: opened from reg_<address>.
      const proof = readDirectoryProof(body.initData, BOT_ID);
      if (!proof || proof.userId !== userId) return reply(400, { error: 'not a registration launch' });
      await db.send(new PutItemCommand({
        TableName: TABLE,
        Item: {
          pk: { S: `tg#${userId}` },
          proof: { S: body.initData },
          address: { S: proof.address },
          updatedAt: { N: String(Date.now()) },
        },
      }));
      if (proof.username) {
        await db.send(new PutItemCommand({ TableName: TABLE, Item: { pk: { S: `name#${proof.username}` }, userId: { S: userId } } }));
      }
      return reply(200, { ok: true, username: proof.username });
    }
    case '/directory/lookup': {
      const hour = Math.floor(Date.now() / 3_600_000);
      const counted = await db.send(new UpdateItemCommand({
        TableName: TABLE,
        Key: { pk: { S: `look#${userId}#${hour}` } },
        UpdateExpression: 'ADD n :one SET #ttl = :ttl',
        ExpressionAttributeNames: { '#ttl': 'ttl' },
        ExpressionAttributeValues: { ':one': { N: '1' }, ':ttl': { N: String((hour + 2) * 3600) } },
        ReturnValues: 'UPDATED_NEW',
      }));
      if (Number(counted.Attributes?.n?.N ?? 0) > LOOKUPS_PER_HOUR) return reply(429, { error: 'too many' });
      let target = typeof body.userId === 'string' && /^\d{1,20}$/.test(body.userId) ? body.userId : null;
      const username = typeof body.username === 'string' ? body.username.replace(/^@/, '').toLowerCase() : '';
      if (!target && /^[a-z0-9_]{4,32}$/.test(username)) {
        const named = await db.send(new GetItemCommand({ TableName: TABLE, Key: { pk: { S: `name#${username}` } } }));
        target = named.Item?.userId?.S ?? null;
      }
      if (!target) return reply(200, { proof: null });
      const entry = await db.send(new GetItemCommand({ TableName: TABLE, Key: { pk: { S: `tg#${target}` } } }));
      return reply(200, { proof: entry.Item?.proof?.S ?? null });
    }
    case '/directory/unregister': {
      await db.send(new DeleteItemCommand({ TableName: TABLE, Key: { pk: { S: `tg#${userId}` } } }));
      return reply(200, { ok: true });
    }
    default:
      return reply(404, { error: 'not found' });
  }
}

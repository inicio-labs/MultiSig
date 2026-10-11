# Miden Telegram wallet

A Telegram mini app: open the bot and you have a Miden wallet. Send and receive
only. Built on the same multisig SDK and Guardian as `coordinator-frontend`.

## How it works

- **Login:** Privy logs the user in silently from Telegram's launch data and
  gives them an embedded wallet. That wallet's key is the account's only signer.
  Signing is silent (`showWalletUIs: false`), so the app's own Review screen is
  the one confirmation before a send.
- **Account:** a 1-of-1 Guardian account (threshold 1, `storageMode: private`).
  Guardian co-signs every transaction and keeps the account state. On any
  device the app finds the account with `recoverByKey` (lookup by key
  commitment), or creates one.
- **First start:** create → register on Guardian → register on the node (the
  testnet sends 1 USDCX) → claim that note. The claim is the first transaction
  and deploys the account.
- **Send / claim:** every transaction of a Guardian account is a proposal, even
  with one signer. One tap runs the whole pipeline: sync to the tip, create,
  sign, execute (remote prover, falling back to the phone), refresh. If an
  execute fails after Guardian accepted it, the app releases Guardian's lock
  right away.

`src/lib/privySigner.ts` adapts Privy's raw-hash signing (`secp256k1_sign`) to
the SDK's `ParaSigner`. The multisig's ECDSA scheme signs `keccak256(word)`
with no EIP-191 prefix, so `personal_sign` would never verify.
`tests/privy-signer.test.ts` checks the signatures byte-for-byte against the
Miden SDK's own ECDSA signer.

## Design

One screen, two bottom sheets, one orange theme (Telegram's theme colours are
ignored, and its header and bars are painted the app's background).

- **Setup is invisible.** Home shows at once. The balance shimmers while the
  account is created, funded and deployed in the background, then a "Welcome
  gift" toast lands. Only Send waits; it says so if tapped early.
- **Incoming payments** wait in Receive, with a count on the bell (top right).
  One tap ("Collect all") claims them. The welcome gift is the only automatic
  claim.
- **Built for the thumb:**
  - actions at the bottom;
  - sheets that swipe down to close;
  - a keypad for amounts (the system keyboard resizes Telegram's webview);
  - slide-to-send, because signing is silent and this is the confirmation;
  - pull-to-refresh, since Telegram's own swipe-to-close is turned off;
  - Telegram haptics, QR scanner, back button, chat picker for sharing, and
    a close confirmation while sending.
- **Pay links:** with `NEXT_PUBLIC_TELEGRAM_APP_URL` set, Share sends
  `…?startapp=pay_<address>`. That link opens the wallet with Send filled in.
- **Recent** is Guardian's history of the account, so it is the same on every
  device. Fee notes are hidden; the account's first transaction is the welcome
  gift.

## Setup

1. **Telegram bot.** Create it with @BotFather.
   - Set its Mini App URL to the deployed app (or a tunnel, below).
   - For the browser login fallback: set Web Login's allowed URL to
     `https://auth.privy.io/api/v1/oauth/callback`, and `/setdomain` to the
     app's domain.
2. **Privy app** (dashboard.privy.io):
   - Enable Telegram login with the bot's token and username, and turn on
     Mini App (seamless) authentication.
   - Allow the app's origin, plus `https://web.telegram.org`.
3. **Environment:** `cp .env.example .env.local`, then set
   `NEXT_PUBLIC_PRIVY_APP_ID`.

```bash
npm install
npm run dev     # http://localhost:3005
npm test
```

Telegram only opens https URLs. For a device test, tunnel the dev server and
use the tunnel's URL as the bot's Mini App URL and in Privy's allowed origins:

```bash
cloudflared tunnel --url http://localhost:3005
```

Each new quick-tunnel hostname has to be updated in both places.

### Without Privy (development)

`NEXT_PUBLIC_DEV_LOCAL_SIGNER=1` replaces Privy with a key kept in
localStorage. That key answers `secp256k1_sign` the way Privy's wallet does,
through the same adapter, so the rest of the app is exercised unchanged.
Production builds refuse it. The `telegram-wallet-dev-signer` launch
configuration runs the app this way on testnet.

## Notes

- **Remote prover:** it sees each transaction's full inputs. Phones prove too
  slowly for local proving to be the default here.
- **Max button:** for the fee token (USDCX on testnet), Max keeps 0.001 for
  fees.
- **Not in v1:**
  - private sends (receiving private notes works);
  - transaction history;
  - signer management.

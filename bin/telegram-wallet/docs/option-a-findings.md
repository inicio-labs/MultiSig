# Option A: phone key for sends, Privy passkey as the backup

Status: investigation and plan (2026-10-14). Nothing here is built yet, apart
from the two hidden test pages described at the end.

## Why

Inside Telegram on iPhone, `navigator.credentials.create` fails with
`NotAllowedError` and shows no prompt: Telegram blocks passkeys for our
domain. Privy's passkey MFA can therefore never complete inside the mini app
on iOS. Option A moves everyday signing to a key that Telegram itself can
guard with Face ID, and keeps the Privy key as a backup that only runs in a
real browser (Safari), where passkeys work.

## Test 2: what Privy MFA does to the wallet

Read from `@privy-io/react-auth` 3.43.0 (`dist/esm/index-BcpLdFr2.mjs`,
`dist/dts/index.d.ts`) and Privy's MFA docs.

### What triggers MFA

Privy's docs say that once a user has enrolled MFA, verification is needed
for anything that uses the embedded wallet's key, "signing messages, sending
transactions, exporting the wallet, and recovering the wallet on new
devices". How long one verification lasts is a dashboard setting (MFA
verification duration, `dashboard.privy.io/admin/mfa-cache-duration`).
`useMfa().clear()` forgets the verification early.

The SDK has one wrapper (`Ca`) around every call to the wallet iframe. If the
user has any MFA method, a call that comes back with `missing_or_invalid_mfa`
fires the `configureMfa.onMfaRequired` event, then waits up to **300 s** for
`useMfa().submit` (or `cancel`). After that it rejects with `mfa_timeout`. It
retries up to 4 times. The wrapped calls include `connect`, `recover`, `rpc`,
`signWithUserSigner`, `addWallet`, `setRecovery` and enroll/unenroll. A
`recover` with no password or recovery token (Privy's automatic recovery)
**asks for MFA up front**, before it tries anything.

Which path runs depends on the wallet type. The Test 1 page shows it on the
"Wallet:" line.

- **TEE wallet** (`recoveryMethod: 'privy-v2'`, the default for newer apps):
  there is no recovery on the device. `recoverEmbeddedWallet` returns at
  once. Each `secp256k1_sign` goes through `handleWalletApiRequest`, which
  needs an authorization signature from the iframe's user signer
  (`signWithUserSigner`, wrapped). With MFA enrolled and no fresh
  verification, every sign asks for MFA. Errors reach the app unchanged.
- **On-device wallet** (`recoveryMethod: 'privy'`): each RPC first runs
  `recoverEmbeddedWallet`, which tries `connect`. In fresh browser storage
  that fails with `wallet_not_on_device`, so the SDK runs `recover`, which
  asks for MFA up front. Telegram's webview and Safari have separate storage,
  so each counts as a new device. The provider turns any failure into
  `Disconnected (4900)`.

Passkey MFA runs `@simplewebauthn/browser`'s `startAuthentication` in the
**app's own window** (`relyingParty: window.origin`), not in Privy's iframe.
Inside Telegram on iOS that is the `NotAllowedError` we already see.

### What this app would see inside Telegram after MFA is enrolled

| Step | Result |
|---|---|
| Seamless Telegram login | **Works.** Wallet MFA is separate from login. Login MFA is a different, experimental feature (`useAuthMfa`) that we do not use. |
| `useWallets()` | **Works.** It lists the wallet from the user's linked accounts. |
| `wallet.getEthereumProvider()` | **Works.** It returns a provider object and does not sign. |
| `createPrivySigner` with no cached public key (new phone, cleared storage) | Its `secp256k1_sign` **asks for MFA**. With today's config (`noPromptOnMfaRequired` unset), Privy opens its own MFA modal over "Preparing your wallet…". Tapping verify fails with `NotAllowedError`. Closing the modal rejects with `MFA canceled`, and AuthGate shows "Could not use your wallet key". Leaving it open hangs for up to 5 min, then fails with `mfa_timeout`. |
| `createPrivySigner` with a cached public key | Skips signing, so the app starts. |
| Guardian session (`resumeSession`) | Works, because it needs no signature. If no session can be resumed, `startSession` signs a grant, which **asks for MFA at app start**. It fails in the background and requests fall back to wallet signatures. |
| `findOrCreate` (load or `recoverByKey`) | Wallet-signed Guardian requests **ask for MFA**, then fail. The wallet cannot start. |
| Send (proposal sign, execute) | **Asks for MFA**, then fails. |

In short, nothing hangs forever: the longest wait is 5 min, when the user
leaves the modal open. But every wallet-signed step shows Privy's modal and
then throws. **Never enroll MFA on a real user's Privy account while the
Telegram app still signs with the Privy key.**

### Recommended handling

1. Inside Telegram, set `mfa: { noPromptOnMfaRequired: true }` on
   `PrivyProvider`. Register `useRegisterMfaListener`, and in its callback
   call `useMfa().cancel()` on the **next tick** (`setTimeout(cancel, 0)`).
   The SDK sets up the pending promise *after* it fires the event, so a
   synchronous `cancel` does nothing. Any Privy signature then fails at once
   with `MFA canceled`, with no modal and no 5-minute wait. Report it to
   diagnostics.
2. In AuthGate, if `user.mfaMethods.length > 0` and we are inside Telegram,
   do not build the Privy signer: use the phone key. If this phone has no
   phone key yet, show the add-this-phone flow.
3. Only offer MFA enrollment in Safari, and only after the account has a
   working phone key (see the upgrade step below).

## Plan

### Keys and threshold

The account stays a Guardian multisig with **threshold 1**. Its signers:

- **One phone key per phone.** A secp256k1 key generated in the mini app and
  stored as Telegram's BiometricManager token. Telegram releases it only
  after Face ID or a fingerprint. It signs every send, the Guardian session
  grant and lookups.
- **The Privy embedded key**, as a backup. It is locked by Privy passkey MFA
  and used only in Safari, to add a new phone when the old one is gone.

Any one signer can act alone. That is the point of the backup, and a phone
key is as strong as Telegram's biometric gate on that phone.

### 1. Phone key: generation and storage

- Generate 32 random bytes with `crypto.getRandomValues` and check the scalar
  is valid (`@noble/curves` secp256k1). Store it as hex (64 characters;
  Telegram allows up to 1024) with
  `BiometricManager.updateBiometricToken(hex, cb)` (Bot API 7.2). This needs
  `isBiometricAvailable` and `isAccessGranted`.
- Each send calls `authenticate({ reason })`, which returns the token. Build
  the signer from it (`EcdsaSigner` from the multisig client, with an SDK
  `AuthSecretKey` made from those bytes; check the constructor), sign, and
  drop the bytes. Never write it to localStorage, CloudStorage or logs.
- Keep only public data on the device: the phone key's public commitment
  (`miden-tg-wallet:phonekey:<tgUserId>`) and `BiometricManager.deviceId`.
  `isBiometricTokenSaved` tells whether a key exists.
- One problem: looking up the account and starting a session also need the
  key, so the app would ask for Face ID at every open. Two options:
  (a) Face ID once per open: release the token, start or resume the Guardian
  session and load the account, then forget the key.
  (b) Keep the session key (already non-extractable P-256, IndexedDB) and the
  remembered account id. Reopening then needs no Face ID; only sends and
  lookups do.
  **Recommend (b)**, because `findOrCreate` already skips the lookup when the
  account is remembered.

### 2. Upgrade for existing users (Privy key only, no MFA yet)

On first open after the update, on a phone with biometrics:

1. Explain it once ("Confirm payments with Face ID"), then generate and store
   the phone key (one Face ID).
2. `multisig.createAddSignerProposal(phoneCommitment)` (threshold stays 1),
   signed by the **Privy key**. Today that signature is silent, as long as MFA
   is not enrolled. Then execute it. This takes one transaction and the
   prover time.
3. From then on, the Telegram app signs with the phone key.
4. Show a card: "Set up recovery: open in Safari, add a passkey." That page
   enrolls Privy passkey MFA (Test 1 flow, but on the real account), after a
   check that a phone key is already on the account.

A phone without biometrics, or a user who declines access, keeps today's
Privy-only setup, without MFA, and is never offered enrollment.

### 3. Session grant and account lookup by phone key

- `MultisigClient.recoverByKey(phoneSigner)`: Guardian's `/state/lookup`
  matches any signer commitment. `EcdsaSigner` implements
  `signLookupMessage`. Check that Guardian indexes added signers, not only
  the creator.
- `startSession(phoneSigner, { store, confirm: () => true })` and
  `resumeSession(phoneSigner, …)`: the session is bound to the phone key.
  Change `WalletProvider`/`AuthGate` so the signer handed up is the phone
  signer once one exists for this account.
- `rememberedKey()` already includes the signer commitment, so it works per
  phone key.

### 4. New phone, approved by the old phone (QR)

1. The new phone (no phone key, Privy key under MFA) generates its key and
   shows a QR code with `privpay-add:<commitment>:<short nonce>`.
2. On the old phone, Settings › Devices › "Add a phone" opens
   `showScanQrPopup`. The old phone shows the commitment's last characters
   and the nonce, asks for Face ID, then runs `createAddSignerProposal`,
   signs and executes.
3. The new phone polls `recoverByKey(newPhoneSigner)` until the account
   appears, then loads it.

An alternative to QR is a pending "add me" request kept by our server, keyed
by Telegram user, which the old phone shows on its next open. QR needs no
server.

### 5. Lost phone: recovery in Safari with the Privy passkey

1. The new phone generates its key. "Recover with your passkey" opens
   `https://privpay.forkchoice.xyz/recover#<commitment>` with
   `Telegram.WebApp.openLink` (Test 3 says which browser that lands in), or
   the user copies the link into Safari. The commitment goes in the fragment,
   so it is never sent to a server.
2. The Safari page: Privy Telegram login (`initOAuth({ provider: 'telegram' })`),
   then its own MFA prompt (`noPromptOnMfaRequired: true`, with a
   "Verify with passkey" button that calls `useMfa().init('passkey')` then
   `submit`). Then `recoverByKey(privySigner)`,
   `createAddSignerProposal(newCommitment)`, sign and execute. Optionally it
   also removes the lost phone (step 6) in the same session.
3. The new phone in Telegram finds the account with `recoverByKey`.

The passkey must be synced (iCloud Keychain or Google Password Manager) to
survive losing the phone. On iOS, passkeys sync by default. Say so when the
user enrolls.

### 6. Removing a lost phone

Settings › Devices lists signer commitments with labels kept in CloudStorage
(public data only). "Remove" runs `createRemoveSignerProposal(commitment)`,
signed by another phone key or by the Privy key in Safari.

Check with Guardian: do sessions granted to a removed signer stop working?
`revokeAllSessions` needs the removed key itself. If they keep working, the
grant TTL caps the exposure, and Guardian should reject sessions of
non-signers.

### Edge cases

- **Reinstalling Telegram, or a new Telegram account on the same phone:** the
  biometric token is probably lost or per account. Treat it as a new phone
  (flow 4 or 5) and test it.
- **Telegram Desktop or Web:** no BiometricManager, so view-only, as today.
- **Face ID changes** (new face enrolled): iOS may invalidate the token.
  Treat it as a new phone.
- **Android:** passkeys inside Telegram may work there. Run Test 1 and the
  passkey check on Android before choosing per-platform behaviour.
- **A proposal in flight while the signer set changes:** run add or remove
  signer only when no other proposal is pending (the engine queue already
  serialises).
- **The MFA verification window** lets the Privy key sign without a prompt
  for that long in Safari. Keep it short in the dashboard.
- **A user who enrolls MFA before having a phone key** (for example through
  Privy's own UI): Telegram would then be stuck. The listener from
  "Recommended handling" makes this fail fast. The upgrade flow cannot sign
  the add-signer proposal, so recovery goes through the Safari page
  (flow 5).
- **Threshold 1 with N keys:** anyone who can pass Face ID on any enrolled
  phone can spend. The Devices list and remove action are the control.

### Effort estimate

| Part | Days |
|---|---|
| Phone key: generate, store as biometric token, signer | 1.5 |
| Upgrade flow (add signer with Privy key) and engine signer switch | 1.5 |
| Session and lookup on the phone key, remembered account | 0.5 |
| MFA guard inside Telegram (listener, AuthGate) | 0.5 |
| Devices list and remove signer | 1 |
| New phone via QR from the old phone | 1.5–2 |
| Safari recovery page (Privy OAuth, custom MFA UI, add/remove signer) | 2 |
| Tests and phone QA (iOS and Android, reinstall cases) | 2 |
| **Total** | **about 10–11 developer days** |

## The test pages (built on this branch)

- **Test 1:** `https://privpay.forkchoice.xyz/?privy_passkey_test=1` in Safari
  (`src/components/PrivyPasskeyTest.tsx`). It needs a throwaway Privy email
  account and refuses any account linked to Telegram. Steps: enroll passkey
  MFA, sign a test hash (does it ask?), sign again (is there a cache
  window?), forget the verification, unenroll.
- **Test 3:** the passkey check (`startapp=passkey_check`, or
  `?passkey_check=1` in any browser) now shows which browser it is in, and
  inside Telegram offers `openLink` with no options, with
  `try_instant_view: true` (Bot API 6.4+) and with `try_browser: 'chrome'`
  (Bot API 7.6+; from `telegram-web-app.js`, with no Safari value), plus
  "Copy link". Run "Create test passkey" in whatever opens.

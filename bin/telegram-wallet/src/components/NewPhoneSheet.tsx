'use client';

import { useEffect, useRef, useState } from 'react';
import { DEV_FAKE_BIOMETRICS } from '@/lib/devBiometrics';
import { formatError } from '@/lib/errors';
import { PhoneKeyNotConfirmed, PhoneKeyUnavailable } from '@/lib/phoneKey';
import { maskEmail, otherPhones, saveRecoveryEmail } from '@/lib/recovery';
import { platformName, readRecoveryBook, updateRecoveryBook, type RecoveryBook } from '@/lib/recoveryBook';
import { tellRecoveryNews } from '@/lib/recoveryNews';
import { storage } from '@/lib/storage';
import { haptic, onDesktop, setClosingConfirmation, telegramPlatform } from '@/lib/telegram';
import { phoneBiometrics, thisPhone } from '@/lib/thisPhone';
import { useRecoveryEmail } from '@/hooks/useRecoveryEmail';
import { Icon } from './Icon';
import { ProgressSteps } from './ProgressSteps';
import { useBiometricName } from './RecoverySheet';
import { Sheet } from './Sheet';
import { useWallet } from './WalletProvider';

type Step = 'ask' | 'email' | 'code' | 'progress' | 'done' | 'failed';

/** This device can hold a phone key: a phone with Face ID or a fingerprint, in Telegram. */
export function canUsePhoneKeyHere(): boolean {
  return DEV_FAKE_BIOMETRICS || (!onDesktop() && phoneBiometrics() !== null);
}

/**
 * This phone's key was on the account and no longer is: another phone took
 * over. A key made but never added (setup or a move interrupted) is not.
 */
export function thisPhoneWasRemoved(recovery: { kind: string; phoneHere?: boolean }): boolean {
  return recovery.kind === 'on' && recovery.phoneHere === false && thisPhone.record()?.active === true;
}

/**
 * Recovery is on and this phone's key is not on the account (a new phone,
 * Telegram reinstalled, or this phone was removed): add this phone with
 * Face ID and a code to the recovery email; the other phones stop sending.
 */
export function NewPhoneSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const { engine, snapshot } = useWallet();
  const bio = useBiometricName();
  const box = useRecoveryEmail();
  const [step, setStep] = useState<Step>('ask');
  const [book, setBook] = useState<RecoveryBook>({ phones: {} });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 2 });
  const asked = useRef<string | null>(null);
  const started = useRef(false);
  // The code was typed here: the move starts on its own once it is accepted.
  const sawCode = useRef(false);

  useEffect(() => {
    if (!open) return;
    setStep('ask');
    setError(null);
    started.current = false;
    asked.current = null;
    sawCode.current = false;
    void readRecoveryBook().then(setBook);
  }, [open]);

  const knownEmail = book.email?.address ?? null;
  const masked = knownEmail ? maskEmail(knownEmail) : null;
  const signers = engine.accountSigners();
  const others = otherPhones(
    { signers, threshold: 2, overrides: {} },
    { telegram: engine.telegramCommitment(), email: book.email?.commitment ?? box.key?.signer.commitment ?? '', phone: null },
  ).filter((c) => c !== thisPhone.commitment());

  // The code goes to the email the wallet was set up with, as soon as the box is up.
  useEffect(() => {
    if (step !== 'code' || !knownEmail || !box.state || asked.current === knownEmail) return;
    if (box.state.step === 'email') {
      asked.current = knownEmail;
      box.sendTo(knownEmail);
    }
  }, [step, knownEmail, box.state]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step === 'email' && box.state?.step === 'code') setStep('code');
    if ((step === 'email' || step === 'code') && box.state?.step === 'code') sawCode.current = true;
  }, [step, box.state?.step]);

  // The code typed here was accepted: that was the approval.
  useEffect(() => {
    if ((step === 'code' || step === 'email') && box.key && sawCode.current && !started.current && box.state?.step === 'ready') {
      started.current = true;
      void move();
    }
  }, [step, box.key, box.state?.step]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setClosingConfirmation(step === 'progress');
    return () => setClosingConfirmation(false);
  }, [step]);

  const move = async () => {
    const phone = thisPhone.commitment();
    const email = box.key;
    if (!phone || !email) return;
    setStep('progress');
    setError(null);
    try {
      await engine.moveToThisPhone({ phone, email: email.signer }, (done, total) => setProgress({ done, total }));
      const removed = others;
      const record = thisPhone.record();
      void updateRecoveryBook((current) => {
        const phones = { ...current.phones, [phone.toLowerCase()]: { platform: record?.platform ?? telegramPlatform(), addedAt: Date.now() } };
        for (const c of removed) delete phones[c.toLowerCase()];
        return { ...current, phones, email: current.email ?? { address: email.email, commitment: email.signer.commitment } };
      });
      if (snapshot.accountId) saveRecoveryEmail(storage, snapshot.accountId, { commitment: email.signer.commitment, masked: maskEmail(email.email) });
      tellRecoveryNews('phone-added', maskEmail(email.email));
      haptic('success');
      setStep('done');
    } catch (e) {
      haptic('error');
      setError(formatError(e));
      started.current = false;
      if (/recovery email of this wallet/.test(formatError(e))) {
        box.change();
        setStep('email');
        return;
      }
      setStep('failed');
    }
  };

  // Continue: this phone's key behind Face ID (one scan), then the code.
  const begin = async () => {
    setBusy(true);
    setError(null);
    try {
      // A key this phone had on the account before (removed since): a new one
      // replaces it. One made but never added is used as it is.
      if (thisPhone.record()?.active) thisPhone.forget();
      await thisPhone.create();
      await thisPhone.key()!.withKey(`Use PrivPay on this phone with ${bio}`, async () => undefined);
      haptic('success');
      setStep(knownEmail ? 'code' : 'email');
    } catch (e) {
      haptic('error');
      if (e instanceof PhoneKeyNotConfirmed) setError('Not confirmed. Try again.');
      else if (e instanceof PhoneKeyUnavailable && e.lock === 'denied') setError(`Allow ${bio} for PrivPay in Telegram’s settings.`);
      else if (e instanceof PhoneKeyUnavailable) setError(`Turn on ${bio} or a fingerprint in your phone’s settings, then come back.`);
      else setError(formatError(e));
    } finally {
      setBusy(false);
    }
  };

  const showBox = step === 'email' || step === 'code';
  const lastStep = progress.done >= progress.total - 1;
  const boxError = box.failed ?? box.state?.error ?? null;
  const signedInAlready = box.key && box.state?.step === 'ready';

  return (
    <Sheet open={open} onClose={onClose} locked={step === 'progress'}>
      {step === 'ask' && (
        <>
          <div className="center nudge">
            <div className="nudge-icon"><Icon name="phone" /></div>
            <div className="page-title">Use PrivPay on this phone</div>
            <div className="sub">
              Your wallet has recovery on. To send from this phone, confirm it with {bio} and a code sent to {masked ?? 'your recovery email'}.
            </div>
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn" disabled={busy} onClick={() => void begin()}>Continue</button>
          <button className="text-btn" onClick={onClose}>Not now</button>
        </>
      )}

      {showBox && (
        <>
          <div className="page-title">{step === 'email' ? 'Your recovery email' : 'Enter the code'}</div>
          <div className="sub">
            {step === 'email'
              ? 'The email you set recovery up with. A code goes there.'
              : signedInAlready ? 'Your recovery email is signed in on this phone.' : <>Sent to <strong>{box.state?.email ? maskEmail(box.state.email) : masked}</strong>.</>}
          </div>
        </>
      )}
      {/* Mounted from the start, so the code can go out as soon as Face ID is done. */}
      <iframe
        ref={box.frame}
        src={box.src}
        title="Recovery email"
        className="email-frame"
        style={{ height: showBox && !signedInAlready ? box.state?.height || 52 : 0 }}
        aria-hidden={!showBox}
      />
      {showBox && (
        <>
          {(boxError || error) && <p className="error" role="alert">{error ?? boxError}</p>}
          {signedInAlready ? (
            <button className="btn" onClick={() => { started.current = true; void move(); }}>Continue</button>
          ) : (
            <button className="btn" disabled={!box.state?.valid || box.state.busy} onClick={box.submit}>
              {box.state?.busy ? 'Checking…' : step === 'email' ? 'Send code' : 'Continue'}
            </button>
          )}
          {step === 'code' && !signedInAlready && (
            <div className="code-actions">
              <button className="text-btn small" onClick={box.resend}>Resend code</button>
              <button className="text-btn small" onClick={() => { box.change(); asked.current = 'manual'; setStep('email'); }}>Use another email</button>
            </div>
          )}
        </>
      )}

      {step === 'progress' && (
        <div className="sending">
          <div className="page-title">Moving your wallet</div>
          <ProgressSteps kind="phone" step={lastStep ? 'proving' : 'signing'} />
          <div className="sub fine">About half a minute · fee under 1¢. Keep PrivPay open.</div>
        </div>
      )}

      {step === 'failed' && (
        <>
          <div className="center nudge">
            <div className="nudge-icon"><Icon name="alert" /></div>
            <div className="page-title">Couldn’t finish</div>
            <div className="sub">Nothing is lost. {error ?? ''}</div>
          </div>
          <button className="btn" onClick={() => { started.current = true; void move(); }}>Try again</button>
          <button className="text-btn" onClick={onClose}>Later</button>
        </>
      )}

      {step === 'done' && (
        <>
          <div className="center">
            <span className="done"><Icon name="check" /></span>
            <div className="page-title">This phone is ready</div>
            <div className="sub">You can send again, with {bio}. {others.length > 0 ? 'Your other phone can no longer send.' : ''}</div>
          </div>
          <button className="btn" onClick={onClose}>Done</button>
        </>
      )}
    </Sheet>
  );
}

/**
 * Next open of a phone another one replaced: what happened, once. It can
 * still show the balance and collect.
 */
/** From the bot's "This wasn't me": what to secure, at once. */
export function NotMeSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="center nudge">
        <div className="nudge-icon"><Icon name="alert" /></div>
        <div className="page-title">If it wasn’t you</div>
        <div className="sub">Someone may have your Telegram, and your recovery email. Do these now:</div>
      </div>
      <div className="cells">
        <div className="cell"><span className="avatar">1</span><span className="cell-main"><span className="cell-title">End other Telegram sessions</span><span className="cell-sub">Telegram › Settings › Devices › Terminate all other sessions</span></span></div>
        <div className="cell"><span className="avatar">2</span><span className="cell-main"><span className="cell-title">Change your email password</span><span className="cell-sub">And turn on two-step login for it</span></span></div>
        <div className="cell"><span className="avatar">3</span><span className="cell-main"><span className="cell-title">Turn on Telegram’s two-step verification</span><span className="cell-sub">Telegram › Settings › Privacy and Security</span></span></div>
      </div>
      <button className="btn" onClick={onClose}>Got it</button>
    </Sheet>
  );
}

export function RemovedPhoneSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const { engine } = useWallet();
  const [book, setBook] = useState<RecoveryBook>({ phones: {} });
  const [help, setHelp] = useState(false);
  useEffect(() => {
    if (open) void readRecoveryBook().then(setBook);
  }, [open]);
  const signers = engine.accountSigners();
  const newest = Object.entries(book.phones)
    .filter(([c]) => signers.some((s) => s.toLowerCase() === c))
    .map(([, p]) => p)
    .sort((a, b) => b.addedAt - a.addedAt)[0];
  const when = newest
    ? new Date(newest.addedAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null;
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="center nudge">
        <div className="nudge-icon"><Icon name="phone" /></div>
        <div className="page-title">This phone was removed</div>
        <div className="sub">
          {when ? `On ${when}, another ${platformName(newest!.platform)}` : 'Another phone'} was added to your wallet with your recovery email. This phone can still show your balance and collect, but it can’t send.
        </div>
        {help && (
          <div className="sub fine-center">
            If it wasn’t you, someone has your Telegram and your email. Change your email password now, and end other sessions in Telegram › Settings › Devices.
          </div>
        )}
      </div>
      <button className="btn" onClick={onClose}>Got it</button>
      {!help && <button className="text-btn" onClick={() => setHelp(true)}>This wasn’t me</button>}
    </Sheet>
  );
}

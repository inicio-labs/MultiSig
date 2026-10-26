'use client';

import { useEffect, useState } from 'react';
import { biometricName, initBiometrics } from '@/lib/biometrics';
import { DEV_FAKE_BIOMETRICS } from '@/lib/devBiometrics';
import { formatError } from '@/lib/errors';
import { PhoneKeyNotConfirmed, PhoneKeyUnavailable } from '@/lib/phoneKey';
import { loadRecoveryEmail, maskEmail, saveRecoveryEmail, type RecoveryEmail } from '@/lib/recovery';
import { updateRecoveryBook } from '@/lib/recoveryBook';
import { tellRecoveryNews } from '@/lib/recoveryNews';
import { storage } from '@/lib/storage';
import { haptic, onDesktop, requestTelegramWriteAccess, setClosingConfirmation, telegramPlatform } from '@/lib/telegram';
import { phoneBiometrics, thisPhone } from '@/lib/thisPhone';
import { useRecoveryEmail } from '@/hooks/useRecoveryEmail';
import { Icon } from './Icon';
import { ProgressSteps } from './ProgressSteps';
import { Sheet } from './Sheet';
import { useWallet } from './WalletProvider';

/** Where setup was opened from: the send gate returns to the send afterwards. */
export type RecoveryFrom = 'nudge' | 'settings' | 'send' | 'receive';

type Step = 'email' | 'code' | 'bio' | 'progress' | 'done' | 'failed' | 'finish';

// Telegram's "allow messages?" popup: long enough to read and answer it.
const WRITE_ACCESS_WAIT_MS = 60_000;

/** What this phone calls its scan ("Face ID" on an iPhone), once Telegram has said. */
export function useBiometricName(): string {
  const [name, setName] = useState('Face ID');
  useEffect(() => {
    const manager = phoneBiometrics();
    if (!manager) return;
    void initBiometrics(manager).then(() => setName(biometricName(manager.biometricType, telegramPlatform() || 'ios')));
  }, []);
  return name;
}

/** Recovery can be set up on this device: a phone with Face ID or a fingerprint, in Telegram. */
export function canSetUpRecoveryHere(): boolean {
  return DEV_FAKE_BIOMETRICS || (!onDesktop() && phoneBiometrics() !== null);
}

/**
 * Setting up recovery (recovery.ts): a recovery email (the code goes there),
 * this phone's key behind Face ID, then the three setup transactions. An
 * interrupted setup resumes at "Finish setting up" without asking again.
 */
export function RecoverySheet({ open, from, onClose, onDone }: {
  open: boolean;
  from: RecoveryFrom;
  onClose(): void;
  /** Recovery is on (read back from the account). */
  onDone(): void;
}) {
  const { engine, snapshot } = useWallet();
  const accountId = snapshot.accountId;
  const bio = useBiometricName();
  const box = useRecoveryEmail();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState<RecoveryEmail | null>(null);
  const [bioError, setBioError] = useState<{ text: string; settings?: boolean } | null>(null);
  const [bioBusy, setBioBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 3 });
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());

  // Each opening: start from what is already done (email chosen, this phone's key made).
  useEffect(() => {
    if (!open || !accountId) return;
    const saved = loadRecoveryEmail(storage, accountId);
    setEmail(saved);
    setBioError(null);
    if (snapshot.recovery.kind === 'on') setStep('done');
    else if (saved && thisPhone.commitment()) setStep('finish');
    else if (saved) setStep('bio');
    else setStep('email');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // The box moved on: the code went out, or the email key is ready.
  useEffect(() => {
    if (!open || !box.state || !accountId) return;
    if (step === 'email' && box.state.step === 'code') {
      setStep('code');
      setNow(Date.now());
      setResendAt(Date.now() + 30_000);
    }
    if ((step === 'email' || step === 'code') && box.key) {
      const chosen = { commitment: box.key.signer.commitment, masked: maskEmail(box.key.email) };
      saveRecoveryEmail(storage, accountId, chosen);
      // A new phone sends the code here by itself (recoveryBook.ts).
      const address = box.key.email;
      void updateRecoveryBook((book) => ({ ...book, email: { address, commitment: chosen.commitment } }));
      setEmail(chosen);
      haptic('success');
      setStep('bio');
    }
  }, [open, box.state, box.key, step, accountId]);

  useEffect(() => {
    if (step !== 'code') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [step]);

  // Telegram asks before closing while the transactions run.
  useEffect(() => {
    setClosingConfirmation(step === 'progress');
    return () => setClosingConfirmation(false);
  }, [step]);

  const run = async () => {
    const phone = thisPhone.commitment();
    if (!email || !phone) return;
    setStep('progress');
    try {
      await engine.setUpRecovery({ phone, email: email.commitment }, (done, total) => setProgress({ done, total }));
      const record = thisPhone.record();
      void updateRecoveryBook((book) => ({
        ...book,
        phones: { ...book.phones, [phone.toLowerCase()]: { platform: record?.platform ?? telegramPlatform(), addedAt: Date.now() } },
      }));
      tellRecoveryNews('set-up', email.masked);
      haptic('success');
      setStep('done');
    } catch (e) {
      console.warn('Recovery setup did not finish', e);
      haptic('error');
      setStep('failed');
    }
  };

  const useBio = async () => {
    setBioBusy(true);
    setBioError(null);
    try {
      // The bot may then message them if the wallet is ever opened on a new phone.
      // Never held on it: a Telegram that does not answer is a "no".
      if (!DEV_FAKE_BIOMETRICS) {
        await Promise.race([
          requestTelegramWriteAccess().catch(() => false),
          new Promise((resolve) => setTimeout(resolve, WRITE_ACCESS_WAIT_MS)),
        ]);
      }
      await thisPhone.create();
      // One scan: Telegram really holds the key.
      await thisPhone.key()!.withKey(`Lock payments with ${bio}`, async () => undefined);
      haptic('success');
      await run();
    } catch (e) {
      haptic('error');
      if (e instanceof PhoneKeyNotConfirmed) setBioError({ text: 'Not confirmed. Try again.' });
      else if (e instanceof PhoneKeyUnavailable && e.lock === 'denied') setBioError({ text: `Allow ${bio} for PrivPay in Telegram’s settings.`, settings: true });
      else if (e instanceof PhoneKeyUnavailable && e.lock === 'no-biometrics') setBioError({ text: `Turn on ${bio} or a fingerprint in your phone’s settings, then come back.` });
      else if (e instanceof PhoneKeyUnavailable) setBioError({ text: `Open PrivPay in Telegram on your phone to use ${bio}.` });
      else setBioError({ text: formatError(e) });
    } finally {
      setBioBusy(false);
    }
  };

  const busy = step === 'progress';
  const back = step === 'code' ? () => { box.change(); setStep('email'); } : undefined;
  const dots = step === 'email' ? 0 : step === 'code' ? 1 : step === 'bio' ? 2 : -1;
  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const boxError = box.failed ?? box.state?.error ?? null;
  const lastStep = progress.done >= progress.total - 1;

  return (
    <Sheet open={open} onClose={onClose} onBack={back} locked={busy}>
      {dots >= 0 && (
        <div className="stepper" aria-hidden>
          {[0, 1, 2].map((i) => <span key={i} className={i <= dots ? 'on' : ''} />)}
        </div>
      )}

      {(step === 'email' || step === 'code') && (
        <>
          <div className="page-title">{step === 'email' ? 'Add a recovery email' : 'Enter the code'}</div>
          <div className="sub">
            {step === 'email'
              ? 'If you lose this phone, a code sent here gets you back in.'
              : box.state?.stale
                ? <>Enter the code we sent to <strong>{box.state.email}</strong>, or send a new one.</>
                : <>We sent a 6-digit code from PrivPay to <strong>{box.state?.email}</strong>.</>}
          </div>
          {/* The field lives on the recovery origin (recoveryFrame.ts). */}
          <iframe
            ref={box.frame}
            src={box.src}
            title="Recovery email"
            className="email-frame"
            style={{ height: box.state?.height || 52 }}
          />
          {boxError && <p className="error" role="alert">{boxError}</p>}
          {step === 'email' && (
            <>
              <div className="trust-line"><Icon name="lock" />Kept by Privy, apart from your Telegram.</div>
              <div className="sub fine">Use an email only you can open. Not your work email if you might leave.</div>
            </>
          )}
          {step === 'code' && (
            <div className="code-actions">
              <button className="text-btn small" disabled={resendIn > 0} onClick={() => { box.resend(); setNow(Date.now()); setResendAt(Date.now() + 30_000); }}>
                {resendIn > 0 ? `Resend in 0:${String(resendIn).padStart(2, '0')}` : 'Resend code'}
              </button>
              <button className="text-btn small" onClick={() => { box.change(); setStep('email'); }}>Change email</button>
            </div>
          )}
          <button className="btn" disabled={!box.state?.valid || box.state.busy} onClick={box.submit}>
            {step === 'email' ? (box.state?.busy ? 'Sending…' : 'Send code') : (box.state?.busy ? 'Checking…' : 'Continue')}
          </button>
        </>
      )}

      {step === 'bio' && (
        <>
          <div className="center nudge">
            <div className="nudge-icon"><Icon name="face" /></div>
            <div className="page-title">Lock payments with {bio}</div>
            <div className="sub">From now on, every payment needs {bio} on this phone. Your face never leaves the phone.</div>
            <div className="sub fine-center">Telegram will ask to allow {bio}, and to let PrivPay message you if your wallet is ever opened on a new phone.</div>
          </div>
          {bioError && <p className="error" role="alert">{bioError.text}</p>}
          {bioError?.settings && <button className="btn soft" onClick={() => phoneBiometrics()?.openSettings()}>Open settings</button>}
          <button className="btn" disabled={bioBusy} onClick={() => void useBio()}><Icon name="face" />Use {bio}</button>
        </>
      )}

      {step === 'finish' && (
        <>
          <div className="center nudge">
            <div className="nudge-icon"><Icon name="lock" /></div>
            <div className="page-title">Finish setting up</div>
            <div className="sub">Recovery is almost on. One more step, about half a minute.</div>
          </div>
          <button className="btn" onClick={() => void run()}>Finish</button>
        </>
      )}

      {step === 'progress' && (
        <div className="sending">
          <div className="page-title">Turning on recovery</div>
          <div className="locks" aria-hidden>
            <span><Icon name="phone" />This phone</span>
            <span><Icon name="at" />Email</span>
            <span><Icon name="lock" />Telegram</span>
          </div>
          <ProgressSteps kind="recovery" step={lastStep ? 'proving' : 'signing'} />
          <div className="sub fine">About half a minute · fee under 1¢. Keep PrivPay open.</div>
        </div>
      )}

      {step === 'failed' && (
        <>
          <div className="center nudge">
            <div className="nudge-icon"><Icon name="alert" /></div>
            <div className="page-title">Couldn’t finish</div>
            <div className="sub">Nothing is lost. Your wallet works as before.</div>
          </div>
          <button className="btn" onClick={() => void run()}>Try again</button>
          <button className="text-btn" onClick={onClose}>Later</button>
        </>
      )}

      {step === 'done' && (
        <>
          <div className="center">
            <span className="done"><Icon name="check" /></span>
            <div className="page-title">Recovery is on</div>
          </div>
          <div className="cells">
            <LockRow icon="face" title={`${bio} on this phone`} sub="Needed for every payment" />
            <LockRow icon="lock" title="Your Telegram" sub="Signs you in and approves payments" />
            <LockRow icon="at" title={email?.masked ?? 'Your recovery email'} sub="Gets you back in on a new phone" />
          </div>
          <div className="sub fine">Keep access to this email. If you lose this phone, you’ll need it.</div>
          <button className="btn" onClick={onDone}>{from === 'send' ? 'Continue to send' : 'Done'}</button>
        </>
      )}
    </Sheet>
  );
}

function LockRow({ icon, title, sub }: { icon: 'face' | 'lock' | 'at'; title: string; sub: string }) {
  return (
    <div className="cell">
      <span className="avatar"><Icon name={icon} /></span>
      <span className="cell-main">
        <span className="cell-title">{title}</span>
        <span className="cell-sub">{sub}</span>
      </span>
    </div>
  );
}

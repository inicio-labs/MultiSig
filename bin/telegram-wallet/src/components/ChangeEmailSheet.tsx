'use client';

import { useEffect, useRef, useState } from 'react';
import { formatError } from '@/lib/errors';
import { PhoneKeyNotConfirmed } from '@/lib/phoneKey';
import { loadRecoveryEmail, maskEmail, saveRecoveryEmail } from '@/lib/recovery';
import { updateRecoveryBook } from '@/lib/recoveryBook';
import { tellRecoveryNews } from '@/lib/recoveryNews';
import { storage } from '@/lib/storage';
import { haptic, setClosingConfirmation } from '@/lib/telegram';
import { thisPhone } from '@/lib/thisPhone';
import { useRecoveryEmail } from '@/hooks/useRecoveryEmail';
import { Icon } from './Icon';
import { ProgressSteps } from './ProgressSteps';
import { useBiometricName } from './RecoverySheet';
import { Sheet } from './Sheet';
import { useWallet } from './WalletProvider';

type Step = 'bio' | 'email' | 'code' | 'progress' | 'done' | 'failed';

// This phone's key stays unlocked from the first scan to the end of the change, at most this long.
const HOLD_MS = 10 * 60 * 1000;

/**
 * Settings › Change recovery email (recovery.ts): Face ID first (one scan,
 * the key then signs the change), the new email and its code, then the new
 * email key replaces the old one. The old email is not needed.
 */
export function ChangeEmailSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const { engine, snapshot } = useWallet();
  const bio = useBiometricName();
  const box = useRecoveryEmail();
  const [step, setStep] = useState<Step>('bio');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 2 });
  const [masked, setMasked] = useState<string | null>(null);
  const release = useRef<(() => void) | null>(null);
  const signedOutOld = useRef(false);
  // The new email's code was typed in this sheet: only a sign-in after it counts
  // (an email already signed in on this phone is the old one).
  const sawCode = useRef(false);
  const started = useRef(false);
  const accountId = snapshot.accountId;

  const letGo = () => {
    release.current?.();
    release.current = null;
  };

  useEffect(() => {
    if (!open) {
      letGo();
      return;
    }
    setStep('bio');
    setError(null);
    signedOutOld.current = false;
    sawCode.current = false;
    started.current = false;
  }, [open]);
  useEffect(() => letGo, []);

  // The old email may still be signed in on this phone: the new one signs in fresh.
  useEffect(() => {
    if (step !== 'email' || signedOutOld.current || !box.state) return;
    signedOutOld.current = true;
    if (box.state.step === 'ready' || box.key) box.change();
  }, [step, box.state]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step === 'email' && box.state?.step === 'code') setStep('code');
    if ((step === 'email' || step === 'code') && box.state?.step === 'code') sawCode.current = true;
  }, [step, box.state?.step]);

  // The new email is signed in: replace the old one.
  useEffect(() => {
    if ((step !== 'email' && step !== 'code') || !box.key || !sawCode.current || started.current || box.state?.step !== 'ready') return;
    const old = accountId ? loadRecoveryEmail(storage, accountId) : null;
    if (old && old.commitment.toLowerCase() === box.key.signer.commitment.toLowerCase()) {
      setError('That’s already your recovery email. Use another one.');
      box.change();
      setStep('email');
      return;
    }
    started.current = true;
    void change(box.key.signer.commitment, box.key.email);
  }, [step, box.key, box.state?.step]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setClosingConfirmation(step === 'progress');
    return () => setClosingConfirmation(false);
  }, [step]);

  const change = async (commitment: string, address: string) => {
    setStep('progress');
    setError(null);
    try {
      await engine.changeRecoveryEmail(commitment, (done, total) => setProgress({ done, total }));
      const newMasked = maskEmail(address);
      if (accountId) saveRecoveryEmail(storage, accountId, { commitment, masked: newMasked });
      void updateRecoveryBook((book) => ({ ...book, email: { address, commitment } }));
      tellRecoveryNews('email-changed', newMasked);
      setMasked(newMasked);
      haptic('success');
      setStep('done');
    } catch (e) {
      haptic('error');
      setError(formatError(e));
      setStep('failed');
    } finally {
      letGo();
    }
  };

  // One scan; the key stays unlocked until the change is done (or the sheet closes).
  const unlock = () => {
    const key = thisPhone.key();
    if (!key) return setError('This phone’s key is missing. Add this phone again first.');
    setBusy(true);
    setError(null);
    const timer = setTimeout(letGo, HOLD_MS);
    key.withKey(`Change your recovery email with ${bio}`, () => new Promise<void>((resolve) => {
      release.current = () => {
        clearTimeout(timer);
        resolve();
      };
      haptic('success');
      setBusy(false);
      setStep('email');
    })).catch((e: unknown) => {
      clearTimeout(timer);
      setBusy(false);
      haptic('error');
      setError(e instanceof PhoneKeyNotConfirmed ? 'Not confirmed. Try again.' : formatError(e));
    });
  };

  const close = () => {
    letGo();
    onClose();
  };

  const showBox = step === 'email' || step === 'code';
  const lastStep = progress.done >= progress.total - 1;
  const boxError = box.failed ?? box.state?.error ?? null;

  return (
    <Sheet open={open} onClose={close} locked={step === 'progress'} onBack={step === 'code' ? () => { box.change(); setStep('email'); } : undefined}>
      {step === 'bio' && (
        <>
          <div className="center nudge">
            <div className="nudge-icon"><Icon name="at" /></div>
            <div className="page-title">Change recovery email</div>
            <div className="sub">Confirm it’s you with {bio}, then add the new email. The old one stops working for recovery.</div>
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn" disabled={busy} onClick={unlock}><Icon name="face" />Use {bio}</button>
          <button className="text-btn" onClick={close}>Not now</button>
        </>
      )}

      {showBox && (
        <>
          <div className="page-title">{step === 'email' ? 'Your new recovery email' : 'Enter the code'}</div>
          <div className="sub">
            {step === 'email'
              ? 'If you lose this phone, a code sent here gets you back in.'
              : <>We sent a 6-digit code from PrivPay to <strong>{box.state?.email}</strong>.</>}
          </div>
        </>
      )}
      {/* The field lives on the recovery origin (recoveryFrame.ts); mounted from the start. */}
      <iframe
        ref={box.frame}
        src={box.src}
        title="Recovery email"
        className="email-frame"
        style={{ height: showBox && box.state?.step !== 'ready' ? box.state?.height || 52 : 0 }}
        aria-hidden={!showBox}
      />
      {showBox && (
        <>
          {(error || boxError) && <p className="error" role="alert">{error ?? boxError}</p>}
          {step === 'email' && <div className="trust-line"><Icon name="lock" />Kept by Privy, apart from your Telegram.</div>}
          {step === 'code' && (
            <div className="code-actions">
              <button className="text-btn small" onClick={box.resend}>Resend code</button>
              <button className="text-btn small" onClick={() => { box.change(); setStep('email'); }}>Change email</button>
            </div>
          )}
          <button className="btn" disabled={!box.state?.valid || box.state.busy} onClick={() => { setError(null); box.submit(); }}>
            {box.state?.busy ? (step === 'email' ? 'Sending…' : 'Checking…') : step === 'email' ? 'Send code' : 'Continue'}
          </button>
        </>
      )}

      {step === 'progress' && (
        <div className="sending">
          <div className="page-title">Changing your recovery email</div>
          <ProgressSteps kind="email" step={lastStep ? 'proving' : 'signing'} />
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
          <button className="btn" onClick={() => { started.current = false; setStep('bio'); }}>Try again</button>
          <button className="text-btn" onClick={close}>Later</button>
        </>
      )}

      {step === 'done' && (
        <>
          <div className="center">
            <span className="done"><Icon name="check" /></span>
            <div className="page-title">Recovery email changed</div>
            <div className="sub">From now on, a code to {masked} gets you back in on a new phone.</div>
          </div>
          <button className="btn" onClick={close}>Done</button>
        </>
      )}
    </Sheet>
  );
}

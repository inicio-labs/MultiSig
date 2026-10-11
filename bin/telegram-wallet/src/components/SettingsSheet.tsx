'use client';

import { authenticate, requestBiometricAccess } from '@/lib/biometrics';
import { usePref } from '@/lib/prefs';
import { haptic, telegramCloud, useTelegramBiometrics } from '@/lib/telegram';
import { Icon, type IconName } from './Icon';
import { Sheet } from './Sheet';

/** Opened from Telegram's own Settings item in the app's menu (or a gear outside Telegram). */
export function SettingsSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const [hideAmounts, setHideAmounts] = usePref('hideAmounts');
  const [sound, setSound] = usePref('sound');
  const [biometricSends, setBiometricSends] = usePref('biometricSends');
  const bio = useTelegramBiometrics();
  const synced = telegramCloud() !== null;
  const bioOn = biometricSends !== false && bio?.granted === true;

  const switchBiometrics = (next: boolean) => {
    if (!bio) return;
    if (!next) {
      // Turning it off takes a scan too, or anyone holding the phone could.
      void authenticate(bio.manager, `Turn off ${bio.name} for sends`).then((ok) => {
        if (ok) setBiometricSends(false);
        else haptic('error');
      });
      return;
    }
    setBiometricSends(true);
    if (!bio.requested) void requestBiometricAccess(bio.manager);
    // Declined before: only Telegram's own settings can allow it now.
    else if (!bio.granted) bio.manager.openSettings();
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="sh-t">Settings</div>
      <div className="cells">
        <Toggle icon="eye" label="Hide amounts" hint="Blur balances and payments" on={hideAmounts === true} set={setHideAmounts} />
        <Toggle icon="bell" label="Sound" hint="A chime when money comes in" on={sound !== false} set={setSound} />
        {bio && (
          <Toggle
            icon={bio.type === 'finger' ? 'fingerprint' : 'face'}
            label={`${bio.name} for sends`}
            hint={bio.requested && !bio.granted ? 'Allow it in Telegram first' : 'Asked before every send'}
            on={bioOn}
            set={switchBiometrics}
          />
        )}
      </div>
      <div className="sub">
        {synced ? 'Saved to your Telegram, on all your devices.' : 'Saved on this device.'}
        {' '}Amounts also blur whenever the app is in the background.
      </div>
    </Sheet>
  );
}

function Toggle({ icon, label, hint, on, set }: { icon: IconName; label: string; hint: string; on: boolean; set(value: boolean): void }) {
  return (
    <button className="cell" role="switch" aria-checked={on} onClick={() => { haptic('selection'); set(!on); }}>
      <span className="avatar"><Icon name={icon} /></span>
      <span className="cell-main">
        <span className="cell-title">{label}</span>
        <span className="cell-sub">{hint}</span>
      </span>
      <span className={`switch${on ? ' on' : ''}`} style={{ marginLeft: 'auto' }} />
    </button>
  );
}

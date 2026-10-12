'use client';

import { alertsAvailable, turnOffAlerts, turnOnAlerts } from '@/lib/alerts';
import { usePref } from '@/lib/prefs';
import { haptic, telegramCloud } from '@/lib/telegram';
import { Icon, type IconName } from './Icon';
import { Sheet } from './Sheet';

/** Opened from Telegram's own Settings item in the app's menu (or a gear outside Telegram). */
export function SettingsSheet({ open, onClose, accountId }: { open: boolean; onClose(): void; accountId: string | null }) {
  const [hideAmounts, setHideAmounts] = usePref('hideAmounts');
  const [sound, setSound] = usePref('sound');
  const [alerts, setAlerts] = usePref('alerts');
  const [, setAlertsAsked] = usePref('alertsAsked');
  const synced = telegramCloud() !== null;

  const switchAlerts = (next: boolean) => {
    if (!accountId) return;
    setAlertsAsked(true);
    if (!next) {
      setAlerts(false);
      void turnOffAlerts(accountId);
      return;
    }
    void turnOnAlerts(accountId).then((on) => {
      setAlerts(on);
      if (!on) haptic('error');
    });
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="sh-t">Settings</div>
      <div className="cells">
        <Toggle icon="eye" label="Hide amounts" hint="Blur balances and payments" on={hideAmounts === true} set={setHideAmounts} />
        <Toggle icon="bell" label="Sound" hint="A chime when money comes in" on={sound !== false} set={setSound} />
        {alertsAvailable() && accountId && (
          <Toggle icon="send" label="Payment alerts" hint="A Telegram message when someone pays you" on={alerts === true} set={switchAlerts} />
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

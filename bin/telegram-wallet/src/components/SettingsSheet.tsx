'use client';

import { useDirectory } from '@/hooks/useDirectory';
import { alertsAvailable, turnOffAlerts, turnOnAlerts } from '@/lib/alerts';
import { usePref } from '@/lib/prefs';
import { haptic, telegramCloud } from '@/lib/telegram';
import { Icon, type IconName } from './Icon';
import { Sheet } from './Sheet';

/** From the gear on the home screen (and Telegram's own Settings item in the app's menu). */
export function SettingsSheet({ open, onClose, accountId }: { open: boolean; onClose(): void; accountId: string | null }) {
  const [hideAmounts, setHideAmounts] = usePref('hideAmounts');
  const [sound, setSound] = usePref('sound');
  const [alerts, setAlerts] = usePref('alerts');
  const [, setAlertsAsked] = usePref('alertsAsked');
  const directory = useDirectory(accountId);
  const synced = telegramCloud() !== null;
  const alertsHere = alertsAvailable() && accountId !== null;

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
      {(directory.available || alertsHere) && (
        <>
          <h2 className="set-head">Getting paid</h2>
          <div className="cells">
            {directory.available && <DirectoryToggle directory={directory} />}
            {alertsHere && (
              <Toggle icon="send" label="Payment alerts" hint="A Telegram message when someone pays you" on={alerts === true} set={switchAlerts} />
            )}
          </div>
        </>
      )}
      <h2 className="set-head">Privacy</h2>
      <div className="cells">
        <Toggle icon="eye" label="Hide amounts" hint="Blur balances and payments" on={hideAmounts === true} set={setHideAmounts} />
      </div>
      <h2 className="set-head">Sounds</h2>
      <div className="cells">
        <Toggle icon="bell" label="Sound" hint="A chime when money comes in" on={sound !== false} set={setSound} />
      </div>
      <div className="sub">
        {synced ? 'Saved to your Telegram, on all your devices.' : 'Saved on this device.'}
        {' '}Amounts also blur whenever the app is in the background.
      </div>
    </Sheet>
  );
}

/** "Pay me by @name", or how to get a username first. */
export function DirectoryToggle({ directory }: { directory: ReturnType<typeof useDirectory> }) {
  if (!directory.username) {
    return (
      <div className="cell">
        <span className="avatar"><Icon name="at" /></span>
        <span className="cell-main">
          <span className="cell-title">Get paid by username</span>
          <span className="cell-sub wrap">Set a username in Telegram (Settings › Username) to get paid by it.</span>
        </span>
      </div>
    );
  }
  return (
    <Toggle
      icon="at"
      label={`Get paid by @${directory.username}`}
      hint="Friends type your username in Send, no address needed."
      on={directory.on}
      set={directory.set}
      wrap
    />
  );
}

export function Toggle({ icon, label, hint, on, set, wrap = false }: {
  icon: IconName;
  label: string;
  hint: string;
  on: boolean;
  set(value: boolean): void;
  /** The hint on several lines instead of cut off. */
  wrap?: boolean;
}) {
  return (
    <button className="cell" role="switch" aria-checked={on} onClick={() => { haptic('selection'); set(!on); }}>
      <span className="avatar"><Icon name={icon} /></span>
      <span className="cell-main">
        <span className="cell-title">{label}</span>
        <span className={`cell-sub${wrap ? ' wrap' : ''}`}>{hint}</span>
      </span>
      <span className={`switch${on ? ' on' : ''}`} style={{ marginLeft: 'auto', flex: 'none' }} />
    </button>
  );
}

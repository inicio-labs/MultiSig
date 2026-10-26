'use client';

import { useDirectory } from '@/hooks/useDirectory';
import { alertsAvailable, turnOffAlerts, turnOnAlerts } from '@/lib/alerts';
import { usePref } from '@/lib/prefs';
import { loadRecoveryEmail } from '@/lib/recovery';
import { storage } from '@/lib/storage';
import { haptic, telegramCloud, telegramPlatform, telegramUsername } from '@/lib/telegram';
import { thisPhone } from '@/lib/thisPhone';
import { Icon, type IconName } from './Icon';
import { canSetUpRecoveryHere, recoveryOffered, useBiometricName } from './RecoverySheet';
import { Sheet } from './Sheet';
import { useWallet } from './WalletProvider';

/** From the gear on the home screen (and Telegram's own Settings item in the app's menu). */
export function SettingsSheet({ open, onClose, accountId, onRecovery }: {
  open: boolean;
  onClose(): void;
  accountId: string | null;
  /** Opens recovery setup (or its finish). */
  onRecovery?(): void;
}) {
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
      <SecuritySection accountId={accountId} onRecovery={onRecovery} />
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


const PLATFORM_NAMES: Record<string, string> = { ios: 'iPhone', android: 'Android phone', android_x: 'Android phone' };

/** "iPhone · since 21 Oct" for this phone's key. */
function phoneLabel(): string {
  const record = thisPhone.record();
  const name = PLATFORM_NAMES[record?.platform ?? telegramPlatform()] ?? 'This phone';
  if (!record?.createdAt) return name;
  return `${name} · since ${new Date(record.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
}

/** Recovery (recovery.ts) as plain rows, never a switch: it stays on once on. */
function SecuritySection({ accountId, onRecovery }: { accountId: string | null; onRecovery?(): void }) {
  const { snapshot } = useWallet();
  const bio = useBiometricName();
  const { recovery } = snapshot;
  if (recovery.kind === 'unknown' || !accountId) return null;
  // Not offered yet (before release): nothing to show for a wallet without it.
  if (recovery.kind === 'off' && !recoveryOffered()) return null;
  const email = loadRecoveryEmail(storage, accountId);
  const here = canSetUpRecoveryHere();
  return (
    <>
      <h2 className="set-head">Security</h2>
      <div className="cells">
        {recovery.kind === 'on' ? (
          <>
            {recovery.phoneHere && <InfoRow icon="face" label={`${bio} on this phone`} hint={phoneLabel()} />}
            <InfoRow icon="lock" label="Your Telegram" hint={telegramUsername() ? `@${telegramUsername()}` : 'Signs you in'} />
            <InfoRow icon="at" label={email?.masked ?? 'Recovery email'} hint="Gets you back in on a new phone" />
          </>
        ) : (
          <button className="cell set-row" onClick={here ? onRecovery : undefined} disabled={!here}>
            <span className="avatar"><Icon name="lock" /></span>
            <span className="cell-main">
              <span className="cell-title">Recovery</span>
              <span className="cell-sub">
                {!here
                  ? `Set up on your phone · needs ${bio}`
                  : recovery.kind === 'partial'
                    ? 'Almost done'
                    : 'Not set up · needed to send $20 or more'}
              </span>
            </span>
            {here && <span className="pill">{recovery.kind === 'partial' ? 'Finish' : 'Set up'}</span>}
          </button>
        )}
      </div>
      {recovery.kind === 'on' && (
        <div className="sub fine">
          Recovery stays on. Lost your phone? Open PrivPay on the new one.
        </div>
      )}
    </>
  );
}

function InfoRow({ icon, label, hint }: { icon: IconName; label: string; hint: string }) {
  return (
    <div className="cell">
      <span className="avatar"><Icon name={icon} /></span>
      <span className="cell-main">
        <span className="cell-title">{label}</span>
        <span className="cell-sub">{hint}</span>
      </span>
    </div>
  );
}

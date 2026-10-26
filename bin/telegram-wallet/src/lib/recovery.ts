/**
 * Recovery: from the Telegram key alone (1 of 1) to any two of three keys,
 * the Telegram key (Privy), this phone's key (phoneKey.ts) and the recovery
 * email key (a separate, email-only Privy user). Payments then need two keys:
 * the phone (one scan) and Telegram (silent). A new phone is added with the
 * Telegram and email keys. Collecting needs one key: money only comes in.
 *
 * Setting it up is three transactions, each signed by the Telegram key alone
 * (the account is still 1 of 1 for them): collecting needs one key, add this
 * phone's key, add the email key and require two. Interrupted, it resumes
 * from the account's rules, never repeating a step.
 */

/** The parts of the account's rules recovery reads. */
export interface AccountRules {
  /** Signer key commitments. */
  signers: string[];
  /** Keys needed by default (payments, signer changes). */
  threshold: number;
  /** Per-procedure overrides (`receive_asset` for collecting). */
  overrides: Partial<Record<string, number>>;
}

export type RecoveryStatus =
  /** The account is not loaded yet. */
  | { kind: 'unknown' }
  /** The Telegram key alone. */
  | { kind: 'off' }
  /** Setup started and was interrupted: "Finish setting up". */
  | { kind: 'partial' }
  /** Two of three. `phoneHere`: this phone's key is one of them (else: a new phone, to add). */
  | { kind: 'on'; phoneHere: boolean };

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const lists = (rules: AccountRules, commitment: string | null | undefined) =>
  Boolean(commitment) && rules.signers.some((s) => same(s, commitment!));

export function recoveryStatus(rules: AccountRules | null, phoneCommitment: string | null): RecoveryStatus {
  if (!rules) return { kind: 'unknown' };
  if (rules.threshold >= 2 && rules.signers.length >= 3) return { kind: 'on', phoneHere: lists(rules, phoneCommitment) };
  if (rules.signers.length === 1 && rules.threshold === 1 && rules.overrides.receive_asset === undefined) return { kind: 'off' };
  return { kind: 'partial' };
}

export type SetupStep =
  /** Collecting needs one key, whatever the default becomes. */
  | { kind: 'collect-with-one' }
  /** Add a key; `threshold` is the keys needed afterwards. */
  | { kind: 'add-key'; key: 'phone' | 'email'; commitment: string; threshold: number }
  /** Both keys are on but payments still need one: require two. */
  | { kind: 'require-two' };

/**
 * What is left to do, from the account's current rules. Run in order; each
 * step is one transaction the Telegram key signs alone (the account needs
 * one key until the last).
 */
export function recoverySteps(rules: AccountRules, keys: { phone: string; email: string }): SetupStep[] {
  const steps: SetupStep[] = [];
  if (rules.overrides.receive_asset !== 1) steps.push({ kind: 'collect-with-one' });
  if (!lists(rules, keys.phone)) steps.push({ kind: 'add-key', key: 'phone', commitment: keys.phone, threshold: 1 });
  if (!lists(rules, keys.email)) steps.push({ kind: 'add-key', key: 'email', commitment: keys.email, threshold: 2 });
  else if (rules.threshold < 2) steps.push({ kind: 'require-two' });
  return steps;
}

/** Shown as "v•••@gmail.com": enough to recognise it, not enough to read it. */
export function maskEmail(email: string): string {
  const [name, domain] = email.trim().split('@');
  if (!name || !domain) return email.trim();
  return `${name[0]}•••@${domain}`;
}

/** The recovery email chosen during setup, kept so an interrupted setup resumes without asking again. */
export interface RecoveryEmail {
  commitment: string;
  masked: string;
}

const EMAIL_KEY = 'miden-tg-wallet:recovery-email:';

type Store = { get(key: string): string | null; set(key: string, value: string): void; remove(key: string): void };

export function loadRecoveryEmail(store: Store, accountId: string): RecoveryEmail | null {
  try {
    const raw = store.get(EMAIL_KEY + accountId.toLowerCase());
    const value = raw ? JSON.parse(raw) as RecoveryEmail : null;
    return value && typeof value.commitment === 'string' && typeof value.masked === 'string' ? value : null;
  } catch {
    return null;
  }
}

export function saveRecoveryEmail(store: Store, accountId: string, email: RecoveryEmail): void {
  store.set(EMAIL_KEY + accountId.toLowerCase(), JSON.stringify(email));
}

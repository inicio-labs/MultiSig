import { describe, expect, it, vi } from 'vitest';
import type { Signer } from '@openzeppelin/miden-multisig-client';
import { emailChangeSteps, maskEmail, newPhoneSteps, otherPhones, recoveryStatus, recoverySteps, type AccountRules } from '../src/lib/recovery';
import { WalletEngine, type WalletEngineDeps, type WalletMidenClient, type WalletMultisigClient } from '../src/lib/walletEngine';

vi.mock('@openzeppelin/miden-multisig-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@openzeppelin/miden-multisig-client')>();
  return { ...actual, AccountInspector: { fromAccount: () => ({ vaultBalances: [] }) } };
});

const TELEGRAM = '0x' + '0c'.repeat(32);
const PHONE = '0x' + 'a1'.repeat(32);
const EMAIL = '0x' + 'e1'.repeat(32);
const NEW_PHONE = '0x' + 'b2'.repeat(32);
const NEW_EMAIL = '0x' + 'f3'.repeat(32);

const rules = (signers: string[], threshold = 1, overrides: AccountRules['overrides'] = {}): AccountRules => ({ signers, threshold, overrides });

describe('recovery status', () => {
  it('reads the Telegram key alone as off, and two of three as on', () => {
    expect(recoveryStatus(null, PHONE)).toEqual({ kind: 'unknown' });
    expect(recoveryStatus(rules([TELEGRAM]), PHONE)).toEqual({ kind: 'off' });
    expect(recoveryStatus(rules([TELEGRAM, PHONE, EMAIL], 2, { receive_asset: 1 }), PHONE)).toEqual({ kind: 'on', phoneHere: true });
  });

  it('knows a phone whose key is not on the account (a new phone)', () => {
    expect(recoveryStatus(rules([TELEGRAM, PHONE, EMAIL], 2), null)).toEqual({ kind: 'on', phoneHere: false });
    expect(recoveryStatus(rules([TELEGRAM, PHONE.toUpperCase().replace('0X', '0x'), EMAIL], 2), PHONE)).toEqual({ kind: 'on', phoneHere: true });
  });

  it('calls an interrupted setup partial', () => {
    expect(recoveryStatus(rules([TELEGRAM], 1, { receive_asset: 1 }), PHONE)).toEqual({ kind: 'partial' });
    expect(recoveryStatus(rules([TELEGRAM, PHONE], 1, { receive_asset: 1 }), PHONE)).toEqual({ kind: 'partial' });
  });
});

describe('recovery setup steps', () => {
  const keys = { phone: PHONE, email: EMAIL };

  it('from the Telegram key alone: collect with one key, add the phone, add the email and require two', () => {
    expect(recoverySteps(rules([TELEGRAM]), keys)).toEqual([
      { kind: 'collect-with-one' },
      { kind: 'add-key', key: 'phone', commitment: PHONE, threshold: 1 },
      { kind: 'add-key', key: 'email', commitment: EMAIL, threshold: 2 },
    ]);
  });

  it('resumes where it stopped, never repeating a step', () => {
    expect(recoverySteps(rules([TELEGRAM], 1, { receive_asset: 1 }), keys)).toEqual([
      { kind: 'add-key', key: 'phone', commitment: PHONE, threshold: 1 },
      { kind: 'add-key', key: 'email', commitment: EMAIL, threshold: 2 },
    ]);
    expect(recoverySteps(rules([TELEGRAM, PHONE], 1, { receive_asset: 1 }), keys)).toEqual([
      { kind: 'add-key', key: 'email', commitment: EMAIL, threshold: 2 },
    ]);
    expect(recoverySteps(rules([TELEGRAM, PHONE, EMAIL], 1, { receive_asset: 1 }), keys)).toEqual([{ kind: 'require-two' }]);
    expect(recoverySteps(rules([TELEGRAM, PHONE, EMAIL], 2, { receive_asset: 1 }), keys)).toEqual([]);
  });

  it('a new phone: add it, then remove the other phones, never the Telegram or email key', () => {
    const on = rules([TELEGRAM, PHONE, EMAIL], 2, { receive_asset: 1 });
    const keys = { telegram: TELEGRAM, email: EMAIL, phone: NEW_PHONE };
    expect(otherPhones(on, keys)).toEqual([PHONE]);
    expect(newPhoneSteps(on, keys)).toEqual([
      { kind: 'add', commitment: NEW_PHONE },
      { kind: 'remove', commitment: PHONE },
    ]);
    // Resumed after the add.
    expect(newPhoneSteps(rules([TELEGRAM, PHONE, EMAIL, NEW_PHONE], 2), keys)).toEqual([{ kind: 'remove', commitment: PHONE }]);
    expect(newPhoneSteps(rules([TELEGRAM, EMAIL, NEW_PHONE], 2), keys)).toEqual([]);
  });

  it('a new recovery email: add it, then remove the old one; Telegram and this phone stay', () => {
    const keys = { telegram: TELEGRAM, phone: PHONE, email: NEW_EMAIL };
    expect(emailChangeSteps(rules([TELEGRAM, PHONE, EMAIL], 2), keys)).toEqual([
      { kind: 'add', commitment: NEW_EMAIL },
      { kind: 'remove', commitment: EMAIL },
    ]);
    expect(emailChangeSteps(rules([TELEGRAM, PHONE, EMAIL, NEW_EMAIL], 2), keys)).toEqual([{ kind: 'remove', commitment: EMAIL }]);
    expect(emailChangeSteps(rules([TELEGRAM, PHONE, NEW_EMAIL], 2), keys)).toEqual([]);
  });

  it('masks the email', () => {
    expect(maskEmail('vaibhav@gmail.com')).toBe('v•••@gmail.com');
    expect(maskEmail('not-an-email')).toBe('not-an-email');
  });
});

/** An account whose rules change as its setup transactions execute. */
function fakeAccount(log: string[], start: AccountRules) {
  const state = { ...start, signers: [...start.signers], overrides: { ...start.overrides } };
  let nonce = 1n;
  let pending: { id: string; apply(): void; required: number; signedBy: Set<string> } | null = null;
  const proposal = (who: string) => ({
    id: pending!.id,
    nonce: Number(nonce),
    status: pending!.signedBy.size >= pending!.required ? 'ready' : 'pending',
    verification: { status: 'verified' },
    signedBy: who,
  });
  const make = (id: string, apply: () => void, required = state.threshold) => {
    pending = { id, apply, required, signedBy: new Set() };
    return { id, nonce: Number(nonce) };
  };
  const instance = (who: string) => ({
    accountId: '0xacc0000000000000000000000000aa',
    account: { nonce: () => ({ asInt: () => nonce }) },
    get signerCommitments() { return state.signers; },
    get threshold() { return state.threshold; },
    get procedureThresholds() { return new Map(Object.entries(state.overrides)); },
    registerOnGuardian: async () => undefined,
    syncState: async () => ({ source: 'guardian' }),
    getConsumableNotes: async () => [],
    deltaHistory: async () => ({ entries: [] }),
    getStoreAccount: async () => ({ nonce: () => ({ asInt: () => nonce }) }),
    listProposals: () => [],
    createUpdateProcedureThresholdProposal: async (procedure: string, threshold: number) => {
      log.push(`override:${procedure}=${threshold}`);
      return make('p-override', () => { state.overrides[procedure] = threshold; });
    },
    createAddSignerProposal: async (commitment: string, options: { newThreshold: number }) => {
      log.push(`add:${commitment.slice(0, 6)}:${options.newThreshold}`);
      return make(`p-add-${commitment.slice(2, 4)}`, () => {
        state.signers.push(commitment);
        state.threshold = options.newThreshold;
      });
    },
    createChangeThresholdProposal: async (threshold: number) => make('p-threshold', () => { state.threshold = threshold; }),
    createRemoveSignerProposal: async (commitment: string, options: { newThreshold: number }) => {
      log.push(`remove:${commitment.slice(0, 6)}:${options.newThreshold}`);
      return make(`p-remove-${commitment.slice(2, 4)}`, () => {
        state.signers = state.signers.filter((s) => s !== commitment);
        state.threshold = options.newThreshold;
      });
    },
    createP2idProposal: async () => { log.push('p2id'); return make('p-send', () => undefined); },
    signProposal: async (id: string) => {
      log.push(`sign:${who}:${id}`);
      pending!.signedBy.add(who);
      return proposal(who);
    },
    syncProposals: async () => (pending ? [proposal(who)] : []),
    executeProposal: async (id: string) => {
      if (!pending || pending.signedBy.size < pending.required) throw new Error('not enough signatures');
      log.push(`execute:${id}`);
      pending.apply();
      pending = null;
      nonce += 1n;
    },
  });
  return { state, instance };
}

const emailSigner = { commitment: EMAIL } as unknown as Signer;

function engineWith(start: AccountRules, phone: string | null = PHONE) {
  const log: string[] = [];
  const account = fakeAccount(log, start);
  const midenClient: WalletMidenClient = {
    sync: async () => undefined,
    syncChain: async () => undefined,
    feeFaucetId: async () => ({ toString: () => '0xfee' }),
    notes: { fetchPrivate: async () => undefined },
  };
  const phoneSigner = { commitment: phone ?? '' } as unknown as Signer;
  const deps: WalletEngineDeps<WalletMidenClient, WalletMultisigClient> = {
    signer: { commitment: TELEGRAM } as unknown as Signer,
    startMidenClient: async () => midenClient,
    createMultisigClient: () => ({ recoverByKey: async () => [{ accountId: '0xacc', state: { updatedAt: '' } }] }),
    createAccount: async () => { throw new Error('no'); },
    loadAccount: async (_c, _id, signer) => account.instance(signer === phoneSigner ? 'phone' : signer === emailSigner ? 'email' : 'telegram') as never,
    registerOnNode: async () => undefined,
    registerNoteTag: async () => undefined,
    startRetryDelaysMs: [],
    guardianCatchUp: { timeoutMs: 0, everyMs: 0 },
    phoneKey: phone ? { commitment: () => phone, signer: async () => phoneSigner } : undefined,
  };
  return { engine: new WalletEngine(deps), log, account };
}

describe('WalletEngine recovery', () => {
  it('shows recovery off for the Telegram key alone, once the account is read', async () => {
    const { engine } = engineWith(rules([TELEGRAM]));
    expect(engine.getSnapshot().recovery).toEqual({ kind: 'unknown' });
    await engine.start();
    expect(engine.getSnapshot().recovery).toEqual({ kind: 'off' });
  });

  it('sets up in three transactions the Telegram key signs alone, then reads two of three back', async () => {
    const { engine, log, account } = engineWith(rules([TELEGRAM]));
    await engine.start();
    const progress: string[] = [];
    await engine.setUpRecovery({ phone: PHONE, email: EMAIL }, (done, total) => progress.push(`${done}/${total}`));
    expect(log.filter((l) => !l.startsWith('sign'))).toEqual([
      'override:receive_asset=1', 'execute:p-override',
      `add:${PHONE.slice(0, 6)}:1`, `execute:p-add-${PHONE.slice(2, 4)}`,
      `add:${EMAIL.slice(0, 6)}:2`, `execute:p-add-${EMAIL.slice(2, 4)}`,
    ]);
    expect(log.filter((l) => l.startsWith('sign')).every((l) => l.startsWith('sign:telegram'))).toBe(true);
    expect(progress).toEqual(['0/3', '1/3', '2/3']);
    expect(account.state).toMatchObject({ threshold: 2, overrides: { receive_asset: 1 } });
    expect(engine.getSnapshot().recovery).toEqual({ kind: 'on', phoneHere: true });
  });

  it('finishes an interrupted setup without repeating what was done', async () => {
    const { engine, log } = engineWith(rules([TELEGRAM, PHONE], 1, { receive_asset: 1 }));
    await engine.start();
    expect(engine.getSnapshot().recovery).toEqual({ kind: 'partial' });
    await engine.setUpRecovery({ phone: PHONE, email: EMAIL });
    expect(log.filter((l) => l.startsWith('add') || l.startsWith('override'))).toEqual([`add:${EMAIL.slice(0, 6)}:2`]);
    expect(engine.getSnapshot().recovery).toEqual({ kind: 'on', phoneHere: true });
  });

  it('once on, a payment is signed by the Telegram key and this phone’s key', async () => {
    const { engine, log } = engineWith(rules([TELEGRAM, PHONE, EMAIL], 2, { receive_asset: 1 }));
    await engine.start();
    await engine.send('0x1111111111111111111111111111ab', '0xfee', 10n);
    expect(log).toEqual(['p2id', 'sign:telegram:p-send', 'sign:phone:p-send', 'execute:p-send']);
  });

  it('a phone without its key cannot pay once recovery is on, and says why', async () => {
    const { engine, log } = engineWith(rules([TELEGRAM, PHONE, EMAIL], 2, { receive_asset: 1 }), null);
    await engine.start();
    expect(engine.getSnapshot().recovery).toEqual({ kind: 'on', phoneHere: false });
    await expect(engine.send('0x1111111111111111111111111111ab', '0xfee', 10n)).rejects.toThrow(/Face ID key/);
    expect(log).not.toContain('execute:p-send');
  });

  it('moves the wallet to a new phone: Telegram and the email key add it, then remove the old one', async () => {
    const { engine, log, account } = engineWith(rules([TELEGRAM, PHONE, EMAIL], 2, { receive_asset: 1 }), NEW_PHONE);
    await engine.start();
    expect(engine.getSnapshot().recovery).toEqual({ kind: 'on', phoneHere: false });
    await engine.moveToThisPhone({ phone: NEW_PHONE, email: emailSigner });
    expect(log).toEqual([
      `add:${NEW_PHONE.slice(0, 6)}:2`, `sign:telegram:p-add-b2`, `sign:email:p-add-b2`, 'execute:p-add-b2',
      `remove:${PHONE.slice(0, 6)}:2`, `sign:telegram:p-remove-a1`, `sign:email:p-remove-a1`, 'execute:p-remove-a1',
    ]);
    expect(account.state.signers).toEqual([TELEGRAM, EMAIL, NEW_PHONE]);
    expect(engine.getSnapshot().recovery).toEqual({ kind: 'on', phoneHere: true });
  });

  it('refuses an email key that is not the wallet’s recovery email', async () => {
    const { engine, log } = engineWith(rules([TELEGRAM, PHONE, EMAIL], 2), NEW_PHONE);
    await engine.start();
    const stranger = { commitment: '0x' + '99'.repeat(32) } as unknown as Signer;
    await expect(engine.moveToThisPhone({ phone: NEW_PHONE, email: stranger })).rejects.toThrow(/recovery email/);
    expect(log).toEqual([]);
  });

  it('changes the recovery email with this phone and Telegram; the old email does not sign', async () => {
    const { engine, log, account } = engineWith(rules([TELEGRAM, PHONE, EMAIL], 2, { receive_asset: 1 }));
    await engine.start();
    await engine.changeRecoveryEmail(NEW_EMAIL);
    expect(log).toEqual([
      `add:${NEW_EMAIL.slice(0, 6)}:2`, 'sign:telegram:p-add-f3', 'sign:phone:p-add-f3', 'execute:p-add-f3',
      `remove:${EMAIL.slice(0, 6)}:2`, 'sign:telegram:p-remove-e1', 'sign:phone:p-remove-e1', 'execute:p-remove-e1',
    ]);
    expect(account.state.signers).toEqual([TELEGRAM, PHONE, NEW_EMAIL]);
    expect(engine.getSnapshot().recovery).toEqual({ kind: 'on', phoneHere: true });
  });

  it('refuses to change the email from a phone that is not on the wallet', async () => {
    const { engine, log } = engineWith(rules([TELEGRAM, PHONE, EMAIL], 2), NEW_PHONE);
    await engine.start();
    await expect(engine.changeRecoveryEmail(NEW_EMAIL)).rejects.toThrow(/phone you pay with/);
    expect(log).toEqual([]);
  });
});

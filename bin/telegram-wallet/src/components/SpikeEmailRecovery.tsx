'use client';

import { useRef, useState } from 'react';
import { AccountInspector, type Multisig, type Signer } from '@openzeppelin/miden-multisig-client';
import { getWasmOrThrow, type MidenClient } from '@miden-sdk/miden-sdk';
import type { Hex } from 'viem';
import { generatePrivateKey, privateKeyToAddress, sign } from 'viem/accounts';
import { DEV_LOCAL_SIGNER } from '@/lib/devSigner';
import { formatError } from '@/lib/errors';
import {
  createMultisigClient,
  createWalletAccount,
  loadWalletAccount,
  registerAccountNoteTag,
  registerAccountOnNode,
} from '@/lib/multisigApi';
import { createPrivySigner } from '@/lib/privySigner';
import { INVITE_ONLY, MIDEN_NETWORK } from '@/config/psm';
import { accountAddress } from '@/lib/address';
import { toHexAccountId } from '@/lib/helpers';
import { assertAddressOnNetwork } from '@/lib/midenNetwork';
import { storage } from '@/lib/storage';
import { formatTokenAmount } from '@/lib/tokenAmounts';
import { startMidenClient } from './WalletProvider';

/**
 * Development spike, never in production (?spike=email-recovery with the
 * development signer): a 2-of-3 account (phone, Telegram, email keys, all
 * local stand-ins here) on testnet. Payments need two keys, collecting one,
 * and recovery adds a new phone with the Telegram and email keys.
 */
export function emailRecoverySpike(): 'email-recovery' | 'email-key' | 'side-by-side' | null {
  if (!DEV_LOCAL_SIGNER) return null;
  const spike = new URLSearchParams(window.location.search).get('spike');
  return spike === 'email-recovery' || spike === 'email-key' || spike === 'side-by-side' ? spike : null;
}

const NAMES = ['phone', 'telegram', 'email', 'newPhone'] as const;
type Name = (typeof NAMES)[number];
const KEY = (name: Name) => `miden-tg-wallet:spike-key:${name}`;

async function spikeSigner(name: Name): Promise<Signer> {
  let key = storage.get(KEY(name)) as Hex | null;
  if (!key) {
    key = generatePrivateKey();
    storage.set(KEY(name), key);
  }
  const privateKey = key;
  const { signer } = await createPrivySigner({
    address: privateKeyToAddress(privateKey),
    provider: {
      async request({ params }) {
        return sign({ hash: (params as [Hex])[0], privateKey, to: 'hex' });
      },
    },
  });
  return signer;
}

type Line = { step: string; result: string; ok: boolean };

/**
 * The spike's steps. `overrides` puts real keys in place of local stand-ins
 * (the email key from a Privy email login); `account` keeps that run's
 * account apart from the all-local one.
 */
export function SpikeEmailRecovery({ overrides = {}, account = 'local', title = `Email recovery test (${MIDEN_NETWORK})` }: {
  overrides?: Partial<Record<Name, Signer>>;
  account?: string;
  title?: string;
}) {
  const ACCOUNT = `miden-tg-wallet:spike-account:${account}`;
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  // Mainnet: the test account registers with one of your invite codes, and
  // its test payments go to a real address of this network (yours by default).
  const [inviteCode, setInviteCode] = useState('');
  const [payTo, setPayTo] = useState('');
  const [testAddress, setTestAddress] = useState<string | null>(null);
  const ctx = useRef<{
    client?: MidenClient;
    multisigClient?: ReturnType<typeof createMultisigClient>;
    // One client (and Guardian connection) per key: a shared connection signs
    // its requests as whichever key loaded last.
    clients: Partial<Record<Name, ReturnType<typeof createMultisigClient>>>;
    signers?: Record<Name, Signer>;
    instances: Partial<Record<Name, Multisig>>;
    pending?: string;
  }>({ instances: {}, clients: {} });

  const log = (step: string, result: string, ok = true) => setLines((all) => [...all, { step, result, ok }]);

  const setup = async () => {
    const c = ctx.current;
    await getWasmOrThrow();
    c.client ??= await startMidenClient();
    c.multisigClient ??= createMultisigClient(c.client);
    if (!c.signers) {
      const entries = await Promise.all(NAMES.map(async (n) => [n, overrides[n] ?? await spikeSigner(n)] as const));
      c.signers = Object.fromEntries(entries) as Record<Name, Signer>;
    }
    return { client: c.client, multisigClient: c.multisigClient, signers: c.signers };
  };

  const accountId = () => {
    const id = storage.get(ACCOUNT);
    if (!id) throw new Error('Create the account first.');
    return id;
  };

  /** The account as one key sees it, brought up to date. */
  const as = async (name: Name): Promise<Multisig> => {
    const { client, signers } = await setup();
    const c = ctx.current;
    c.clients[name] ??= createMultisigClient(client);
    c.instances[name] ??= await loadWalletAccount(c.clients[name]!, accountId(), signers[name]);
    const ms = c.instances[name]!;
    await client.sync();
    await ms.syncState().catch((e: unknown) => {
      if (!/nonce is too low/i.test(formatError(e))) throw e;
    });
    await ms.syncProposals();
    return ms;
  };

  /** Guardian takes the last transaction before the next one is built. */
  const caughtUp = async (ms: Multisig) => {
    for (let i = 0; i < 45; i++) {
      const r = await ms.syncState().catch(() => null) as { source?: string; localNonce?: bigint; guardianNonce?: bigint } | null;
      if (!(r?.source === 'local' && BigInt(r.guardianNonce ?? 0) < BigInt(r.localNonce ?? 0))) return;
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
  };

  const run = async (step: string, task: () => Promise<string>, expectFailure = false) => {
    setBusy(true);
    const started = performance.now();
    try {
      const result = await task();
      const s = ((performance.now() - started) / 1000).toFixed(1);
      log(step, `${expectFailure ? 'UNEXPECTED SUCCESS' : 'OK'} (${s}s) ${result}`, !expectFailure);
    } catch (e) {
      const s = ((performance.now() - started) / 1000).toFixed(1);
      log(step, `${expectFailure ? 'REFUSED as expected' : 'FAILED'} (${s}s) ${formatError(e)}`, expectFailure);
    } finally {
      setBusy(false);
    }
  };

  const keys = () => run('Keys', async () => {
    const { signers } = await setup();
    return NAMES.map((n) => `${n} ${signers[n].commitment.slice(0, 10)}…`).join(' · ');
  });

  const create = () => run('Create 2-of-3 account (collect: 1)', async () => {
    const { client, multisigClient, signers } = await setup();
    const code = inviteCode.trim();
    if (INVITE_ONLY) {
      if (!code) throw new Error('Enter an invite code first (this network is invite-only).');
      if (!(await client.accounts.isInvitationCodeValid(code))) throw new Error('That invite code isn’t valid, or it was already used.');
    }
    const ms = await createWalletAccount(multisigClient, signers.phone, {}, {
      signerCommitments: [signers.phone.commitment, signers.telegram.commitment, signers.email.commitment],
      threshold: 2,
      procedureThresholds: [{ procedure: 'receive_asset', threshold: 1 }],
    });
    await ms.registerOnGuardian();
    storage.set(ACCOUNT, ms.accountId);
    ctx.current.instances = { phone: ms };
    await registerAccountNoteTag(client, ms.accountId);
    await registerAccountOnNode(client, ms.accountId, code || undefined);
    setTestAddress(accountAddress(ms.accountId));
    return MIDEN_NETWORK === 'testnet'
      ? `account ${ms.accountId}, registered (the network funds it)`
      : `account ${accountAddress(ms.accountId)}, registered. Send it about 0.1 USDCX for fees, then Status.`;
  });

  /** Where test payments go: an address of this network; never a guess. */
  const payTarget = (): string => {
    const value = payTo.trim();
    if (!value) throw new Error('Set where test payments go first (“Use my PrivPay wallet” or an address).');
    assertAddressOnNetwork(value, MIDEN_NETWORK);
    return toHexAccountId(value);
  };

  const useMyWallet = () => run('Test payments go to your PrivPay wallet', async () => {
    const { multisigClient, signers } = await setup();
    const testId = storage.get(ACCOUNT)?.toLowerCase();
    const mine = (await multisigClient.recoverByKey(signers.telegram))
      .filter((m) => m.accountId.toLowerCase() !== testId)
      .sort((a, b) => Date.parse(b.state.updatedAt) - Date.parse(a.state.updatedAt))[0];
    if (!mine) throw new Error('No PrivPay wallet found for your Telegram key on this network. Paste an address instead.');
    setPayTo(accountAddress(mine.accountId));
    return accountAddress(mine.accountId);
  });

  const status = () => run('Status', async () => {
    const ms = await as('phone');
    setTestAddress(accountAddress(ms.accountId));
    const balances = AccountInspector.fromAccount(ms.account).vaultBalances
      .map((b) => `${formatTokenAmount(b.amount, 6)} (${b.faucetId.slice(0, 8)}…)`).join(', ') || '0';
    const notes = await ms.getConsumableNotes();
    const signers = await ms.getSignerPublicKeyCommitments();
    const overrides = [...ms.procedureThresholds.entries()].map(([p, t]) => `${p}=${t}`).join(' ');
    return `balance ${balances} · waiting notes ${notes.length} · signers ${signers.length} · threshold ${ms.threshold} ${overrides}`;
  });

  const collect = (who: Name) => run(`Collect, signed by ${who} only`, async () => {
    const ms = await as(who);
    await caughtUp(ms);
    const notes = await ms.getConsumableNotes();
    if (notes.length === 0) return 'nothing to collect yet';
    const proposal = await ms.createConsumeNotesProposal(notes.map((n) => n.id));
    await ms.signProposal(proposal.id);
    await ms.executeProposal(proposal.id);
    return `collected ${notes.length} note(s)`;
  });

  const payOne = (who: Name) => run(`Pay 0.01, signed by ${who} only`, async () => {
    const ms = await as(who);
    await caughtUp(ms);
    const faucet = AccountInspector.fromAccount(ms.account).vaultBalances[0]?.faucetId;
    if (!faucet) throw new Error('no balance yet: collect first');
    const proposal = await ms.createP2idProposal(payTarget(), faucet, 10_000n);
    ctx.current.pending = proposal.id;
    await ms.signProposal(proposal.id);
    await ms.executeProposal(proposal.id);
    return 'executed with one key';
  }, true);

  const secondSignature = (who: Name) => run(`Add ${who} signature to that payment, then execute`, async () => {
    const ms = await as(who);
    // After a reload: the latest unfinished payment.
    const id = ctx.current.pending
      ?? ms.listProposals().filter((p) => p.metadata.proposalType === 'p2id' && p.status !== 'finalized').at(-1)?.id;
    if (!id) throw new Error('make a one-key payment first');
    await ms.signProposal(id);
    await ms.executeProposal(id);
    ctx.current.pending = undefined;
    return 'executed with two keys';
  });

  const signerChange = (step: string, make: (ms: Multisig, s: Record<Name, Signer>) => Promise<{ id: string }>, by: [Name, Name]) =>
    run(step, async () => {
      const at = async <T,>(label: string, work: () => Promise<T>): Promise<T> => {
        try {
          return await work();
        } catch (e) {
          const body = (e as { body?: unknown }).body;
          throw new Error(`${label}: ${formatError(e)}${body ? ` · body: ${String(body).slice(0, 400)}` : ''}`);
        }
      };
      const { signers } = await setup();
      const first = await at(`load as ${by[0]}`, () => as(by[0]));
      await caughtUp(first);
      const proposal = await at('create proposal', () => make(first, signers));
      await at(`sign as ${by[0]}`, () => first.signProposal(proposal.id));
      const second = await at(`load as ${by[1]}`, () => as(by[1]));
      await at(`sign as ${by[1]}`, () => second.signProposal(proposal.id));
      // The first key's copy learns the second signature from Guardian.
      await at('re-read proposals', () => first.syncProposals());
      await at('execute', () => first.executeProposal(proposal.id));
      const after = await (await as(by[0])).getSignerPublicKeyCommitments();
      return `signers now ${after.length}: ${after.map((c) => c.slice(0, 10)).join(', ')}`;
    });

  const addNewPhone = () => signerChange('Recovery: Telegram + email add the new phone',
    (ms, s) => ms.createAddSignerProposal(s.newPhone.commitment, { newThreshold: 2 }), ['telegram', 'email']);

  const removeOldPhone = () => signerChange('Recovery: Telegram + email remove the old phone',
    (ms, s) => ms.createRemoveSignerProposal(s.phone.commitment, { newThreshold: 2 }), ['telegram', 'email']);

  const inspect = () => run('Pending proposals and who signed', async () => {
    const { signers } = await setup();
    const ms = await as('telegram');
    const who = (c: string) => NAMES.find((n) => signers[n].commitment.toLowerCase() === c.toLowerCase()) ?? c.slice(0, 10);
    return ms.listProposals()
      .filter((p) => p.status !== 'finalized')
      .map((p) => `${p.id.slice(0, 10)} ${p.metadata.proposalType} [${p.signatures.map((sg) => who(sg.signerId)).join(', ')}]${p.id === ctx.current.pending ? ' (pending)' : ''}`)
      .join(' · ') || 'none';
  });

  const button = (label: string, action: () => void) => (
    <button className="btn soft" disabled={busy} onClick={action}>{label}</button>
  );
  return (
    <main className="screen" style={{ display: 'grid', gap: 8 }}>
      <div className="page-title">{title}</div>
      {button('1. Show keys', keys)}
      {INVITE_ONLY && (
        <input className="field" placeholder="Invite code for the test account" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      )}
      {button('2. Create 2-of-3 account', create)}
      {testAddress && (
        <div className="cell">
          <span className="cell-main">
            <span className="cell-title">Test account (fund it with ~0.1 USDCX)</span>
            <span className="cell-sub wrap selectable">{testAddress}</span>
          </span>
          <button className="text-btn small" onClick={() => void navigator.clipboard.writeText(testAddress)}>Copy</button>
        </div>
      )}
      <input className="field" placeholder="Test payments go to (mm1… address)" value={payTo} onChange={(e) => setPayTo(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      {button('Use my PrivPay wallet', useMyWallet)}
      {button('3. Status', status)}
      {button('4. Collect with phone only (expect OK)', () => collect('phone'))}
      {button('5. Pay with phone only (expect refused)', () => payOne('phone'))}
      {button('6. Add Telegram signature, execute (expect OK)', () => secondSignature('telegram'))}
      {button('7. Pay with email only (expect refused)', () => payOne('email'))}
      {button('8. Recovery: add new phone (Telegram + email)', addNewPhone)}
      {button('9. Recovery: remove old phone (Telegram + email)', removeOldPhone)}
      {button('10. Pay with new phone only (expect refused)', () => payOne('newPhone'))}
      {button('11. Add Telegram signature, execute (expect OK)', () => secondSignature('telegram'))}
      {button('12. Inspect pending proposals', inspect)}
      <div className="cells">
        {lines.map((l, i) => (
          <div key={i} className="cell">
            <span className="cell-main">
              <span className="cell-title" style={{ color: l.ok ? undefined : 'var(--danger)' }}>{l.step}</span>
              <span className="cell-sub wrap selectable">{l.result}</span>
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}

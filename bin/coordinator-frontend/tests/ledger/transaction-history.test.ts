import { describe, expect, it } from 'vitest';
import type { HistoryEntry, HistoryNote } from '@openzeppelin/guardian-client';
import {
  describeHistoryEntry,
  settingsDetail,
  settingsTitle,
  soleCounterparty,
  sortHistory,
  totalsByToken,
} from '../../src/lib/transactionHistory';

const ACCOUNT = '0xaaaa00000000000000000000000000';
const FEE_TOKEN = '0xe69e6ca6e39df1b10c1e5399399feb';
const ETH = '0x1111000000000000000000000000ab';
const BOB = '0xbbbb00000000000000000000000000';

const note = (fields: Partial<HistoryNote>): HistoryNote => ({
  noteId: '0xnote',
  tag: 'p2id',
  noteType: 'public',
  assets: [],
  ...fields,
});
const fungible = (assetId: string, amount: string) => ({ assetId, kind: 'fungible' as const, amount });
const feeNote = (amount = '1500', token = FEE_TOKEN) =>
  note({ tag: 'custom', sender: ACCOUNT, assets: [fungible(token, amount)] });
const entry = (fields: Partial<HistoryEntry>): HistoryEntry => ({
  nonce: 7,
  status: 'canonical',
  timestamp: '2026-10-26T09:30:00.123456Z',
  inputNotes: [],
  outputNotes: [],
  decodeWarnings: [],
  ...fields,
});

describe('a history row says what the transaction did', () => {
  it('a send: the P2ID note to its recipient, and the TX_FEE note as the fee (not a second send)', () => {
    const item = describeHistoryEntry(entry({
      outputNotes: [note({ sender: ACCOUNT, recipient: BOB, assets: [fungible(ETH, '250')] }), feeNote()],
    }), ACCOUNT, FEE_TOKEN);
    expect(item).toMatchObject({
      key: 7,
      kind: 'sent',
      sent: [{ faucetId: ETH, amount: 250n, counterparty: BOB }],
      received: [],
      fees: [{ faucetId: FEE_TOKEN, amount: 1500n }],
      undecoded: false,
    });
    expect(item.at).toBe(Date.parse('2026-10-26T09:30:00.123Z'));
  });

  it('a receive: the consumed notes, from their sender', () => {
    const item = describeHistoryEntry(entry({
      inputNotes: [note({ sender: BOB, recipient: ACCOUNT, assets: [fungible(FEE_TOKEN, '+40000')] })],
      outputNotes: [feeNote()],
    }), ACCOUNT, FEE_TOKEN);
    expect(item).toMatchObject({ kind: 'received', received: [{ faucetId: FEE_TOKEN, amount: 40000n, counterparty: BOB }], sent: [] });
  });

  it('a settings change: no notes but the fee', () => {
    expect(describeHistoryEntry(entry({ outputNotes: [feeNote()] }), ACCOUNT, FEE_TOKEN).kind).toBe('settings');
  });

  it('takes no note for the fee until the fee token is known, nor one of another token or account', () => {
    expect(describeHistoryEntry(entry({ outputNotes: [feeNote()] }), ACCOUNT, null)).toMatchObject({ kind: 'other', fees: [] });
    expect(describeHistoryEntry(entry({ outputNotes: [feeNote('5', ETH)] }), ACCOUNT, FEE_TOKEN).fees).toEqual([]);
    const foreign = note({ tag: 'custom', sender: BOB, assets: [fungible(FEE_TOKEN, '5')] });
    expect(describeHistoryEntry(entry({ outputNotes: [foreign] }), ACCOUNT, FEE_TOKEN).fees).toEqual([]);
  });

  it('a swap when any note is a PSWAP', () => {
    const item = describeHistoryEntry(entry({ outputNotes: [note({ tag: 'pswap', assets: [fungible(ETH, '3')] }), feeNote()] }), ACCOUNT, FEE_TOKEN);
    expect(item.kind).toBe('swap');
  });

  it('says the details are unavailable when Guardian could not decode the notes, never "settings"', () => {
    const item = describeHistoryEntry(entry({ decodeWarnings: [{ section: 'output_notes', reason: 'drift' }] }), ACCOUNT, FEE_TOKEN);
    expect(item).toMatchObject({ kind: 'other', undecoded: true });
  });

  it('leaves out non-fungible assets and amounts that do not parse', () => {
    const item = describeHistoryEntry(entry({
      outputNotes: [note({ recipient: BOB, assets: [{ assetId: ETH, kind: 'non_fungible' }, fungible(ETH, '1e5'), fungible(ETH, '-7')] })],
    }), ACCOUNT, FEE_TOKEN);
    expect(item.sent).toEqual([{ faucetId: ETH, amount: 7n, counterparty: BOB }]);
  });
});

describe('history order and totals', () => {
  it('orders by when each became canonical, so rows keyed by time (0.18.0) do not sit above newer ones', () => {
    const oldTimeKeyed = entry({ nonce: 1_760_000_000_000, timestamp: '2026-10-01T00:00:00Z' });
    const newer = entry({ nonce: 12, timestamp: '2026-10-20T00:00:00Z' });
    const newest = entry({ nonce: 13, timestamp: '2026-10-20T00:00:00Z' });
    expect(sortHistory([oldTimeKeyed, newer, newest]).map((row) => row.nonce)).toEqual([13, 12, 1_760_000_000_000]);
  });

  it('adds amounts up per token and names the other account only when there is one', () => {
    const moves = [
      { faucetId: ETH, amount: 2n, counterparty: BOB },
      { faucetId: ETH.toUpperCase().replace('0X', '0x'), amount: 3n, counterparty: BOB.toUpperCase() },
      { faucetId: FEE_TOKEN, amount: 1n },
    ];
    expect(totalsByToken(moves)).toEqual([{ faucetId: ETH, amount: 5n }, { faucetId: FEE_TOKEN, amount: 1n }]);
    expect(soleCounterparty(moves)).toBe(BOB);
    expect(soleCounterparty([...moves, { faucetId: ETH, amount: 1n, counterparty: ACCOUNT }])).toBeUndefined();
    expect(soleCounterparty([])).toBeUndefined();
  });
});

describe('settings rows by the proposal they executed', () => {
  it('names the change and the settings it left', () => {
    const md = { proposalType: 'add_signer', targetThreshold: 2, signerCommitments: ['0x1', '0x2', '0x3'] };
    expect(settingsTitle(md)).toBe('Added a signer');
    expect(settingsDetail(md)).toBe('Now 2 of 3 signers');
    expect(settingsTitle({ proposalType: 'switch_guardian', newGuardianEndpoint: 'https://g.example' })).toBe('Switched Guardian');
    expect(settingsDetail({ proposalType: 'switch_guardian', newGuardianEndpoint: 'https://g.example' })).toBe('https://g.example');
  });

  it('falls back to a general title without metadata', () => {
    expect(settingsTitle(undefined)).toBe('Account settings changed');
    expect(settingsDetail(null)).toBeUndefined();
  });
});

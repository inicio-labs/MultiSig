import type { HistoryEntry, HistoryNote, ProposalMetadata } from '@openzeppelin/guardian-client';

/**
 * The account's executed transactions, from Guardian's canonical history
 * (`Multisig.deltaHistory`). Guardian forgets a proposal once it is executed,
 * so the proposal list is not a history; every multisig transaction is pushed
 * through Guardian, so this is.
 */

/**
 * Guardian lists history newest-first by its storage key: `Date.now()` for
 * proposals made by TypeScript clients through 0.18.0, the account's next
 * nonce since 0.18.1. Old rows keep their keys, and a timestamp sorts above any
 * account nonce, so on an account used before the switch (or by a cosigner
 * still on 0.18.0) the first entries are not the latest transaction.
 */
export const TIMESTAMP_KEY = 1e12;

/** When the entry became canonical, in ms; -Infinity when Guardian's time does not parse. */
export function canonicalAt(entry: Pick<HistoryEntry, 'timestamp'>): number {
  // RFC 3339; Date.parse keeps milliseconds, so drop finer digits first.
  const time = Date.parse(entry.timestamp.replace(/(\.\d{3})\d+/, '$1'));
  return Number.isNaN(time) ? -Infinity : time;
}

/** An amount of one token a transaction moved, and the other account when the note names it. */
export interface Movement {
  faucetId: string;
  amount: bigint;
  /** Hex ID of the account on the other side. */
  counterparty?: string;
}

export type HistoryKind = 'sent' | 'received' | 'swap' | 'settings' | 'other';

export interface HistoryItem {
  /** Guardian's key for the row (see TIMESTAMP_KEY); getDelta reads the row by it. */
  key: number;
  /** When it became canonical (ms), or null when Guardian's time does not parse. */
  at: number | null;
  kind: HistoryKind;
  sent: Movement[];
  received: Movement[];
  /** The network fee: Miden 0.18 pays it with a TX_FEE note of the fee token. */
  fees: Movement[];
  /** Guardian could not decode the notes, so what moved is unknown. */
  undecoded: boolean;
}

const sameId = (a: string, b: string) => a.replace(/^0x/i, '').toLowerCase() === b.replace(/^0x/i, '').toLowerCase();

/**
 * The TX_FEE note: Guardian tags it `custom`; it names no recipient and holds
 * only the fee token. Until the fee token is known no note is taken for it.
 */
function isFeeNote(note: HistoryNote, accountId: string, nativeFaucetId: string | null): boolean {
  if (!nativeFaucetId || note.tag !== 'custom' || note.recipient) return false;
  if (note.sender && !sameId(note.sender, accountId)) return false;
  return note.assets.length > 0
    && note.assets.every((asset) => asset.kind === 'fungible' && sameId(asset.assetId, nativeFaucetId));
}

/** The fungible amounts on these notes; an amount that does not parse is left out. */
function movements(notes: readonly HistoryNote[], counterparty: (note: HistoryNote) => string | undefined): Movement[] {
  return notes.flatMap((note) => note.assets.flatMap((asset) => {
    const digits = asset.amount?.replace(/^[+-]/, '');
    if (asset.kind !== 'fungible' || !digits || !/^\d+$/.test(digits)) return [];
    const other = counterparty(note);
    return [{ faucetId: asset.assetId, amount: BigInt(digits), ...(other ? { counterparty: other } : {}) }];
  }));
}

const DECODED_SECTIONS = new Set(['tx_summary', 'input_notes', 'output_notes']);

/** What one canonical transaction did, from the notes Guardian decoded. */
export function describeHistoryEntry(entry: HistoryEntry, accountId: string, nativeFaucetId: string | null): HistoryItem {
  const fees = entry.outputNotes.filter((note) => isFeeNote(note, accountId, nativeFaucetId));
  const outputs = entry.outputNotes.filter((note) => !fees.includes(note));
  const inputs = entry.inputNotes;
  const undecoded = entry.decodeWarnings.some((warning) => DECODED_SECTIONS.has(warning.section));

  let kind: HistoryKind;
  if ([...inputs, ...outputs].some((note) => note.tag === 'pswap')) kind = 'swap';
  else if (outputs.length > 0 && inputs.length === 0 && outputs.every((note) => note.tag === 'p2id' || note.tag === 'p2ide')) kind = 'sent';
  else if (inputs.length > 0 && outputs.length === 0) kind = 'received';
  else if (inputs.length === 0 && outputs.length === 0 && !undecoded) kind = 'settings';
  else kind = 'other';

  const at = canonicalAt(entry);
  return {
    key: entry.nonce,
    at: Number.isFinite(at) ? at : null,
    kind,
    sent: movements(outputs, (note) => note.recipient),
    received: movements(inputs, (note) => (note.sender && !sameId(note.sender, accountId) ? note.sender : undefined)),
    fees: movements(fees, () => undefined),
    undecoded,
  };
}

/** Newest first by when each became canonical (Guardian's order is by key, see TIMESTAMP_KEY). */
export function sortHistory(entries: readonly HistoryEntry[]): HistoryEntry[] {
  return [...entries].sort((a, b) => canonicalAt(b) - canonicalAt(a) || b.nonce - a.nonce);
}

/** Amounts added up per token, in first-seen order. */
export function totalsByToken(moves: readonly Movement[]): Array<{ faucetId: string; amount: bigint }> {
  const totals = new Map<string, bigint>();
  for (const move of moves) {
    const key = move.faucetId.toLowerCase();
    totals.set(key, (totals.get(key) ?? 0n) + move.amount);
  }
  return [...totals].map(([faucetId, amount]) => ({ faucetId, amount }));
}

/** The one account on the other side, or undefined when there are none or several. */
export function soleCounterparty(moves: readonly Movement[]): string | undefined {
  const ids = new Set(moves.flatMap((move) => (move.counterparty ? [move.counterparty.toLowerCase()] : [])));
  return ids.size === 1 ? [...ids][0] : undefined;
}

/** A settings change by the proposal it executed, when Guardian kept the proposal's metadata. */
export function settingsTitle(metadata: ProposalMetadata | null | undefined): string {
  switch (metadata?.proposalType) {
    case 'add_signer': return 'Added a signer';
    case 'remove_signer': return 'Removed a signer';
    case 'change_threshold': return 'Changed the threshold';
    case 'update_procedure_threshold': return 'Changed a procedure threshold';
    case 'switch_guardian': return 'Switched Guardian';
    default: return 'Account settings changed';
  }
}

/** The settings the change left, e.g. "Now 2 of 3 signers". */
export function settingsDetail(metadata: ProposalMetadata | null | undefined): string | undefined {
  if (!metadata) return undefined;
  switch (metadata.proposalType) {
    case 'add_signer':
    case 'remove_signer':
    case 'change_threshold': {
      const signers = metadata.signerCommitments?.length;
      return metadata.targetThreshold !== undefined && signers
        ? `Now ${metadata.targetThreshold} of ${signers} signers`
        : undefined;
    }
    case 'update_procedure_threshold':
      return metadata.targetProcedure && metadata.targetThreshold !== undefined
        ? `${metadata.targetProcedure.replaceAll('_', ' ')} threshold ${metadata.targetThreshold}`
        : undefined;
    case 'switch_guardian':
      return metadata.newGuardianEndpoint;
    default:
      return undefined;
  }
}

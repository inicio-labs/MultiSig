import { describe, expect, it, vi } from 'vitest';
import { AccountId, AccountInterface, NetworkId } from '@miden-sdk/miden-sdk';
import { GuardianHttpError } from '@openzeppelin/guardian-client';
import { toHexAccountId } from '../../src/lib/helpers';
import { classifyWalletError, isWalletDecline } from '../../src/lib/errors';
import {
  accountAddress,
  accountIdFromInput,
  accountLookupRunner,
  findAccountsByKey,
  lookupErrorMessage,
  type AccountLookup,
} from '../../src/lib/findAccounts';

const id = '0xdeadc17b13b218c14cfa7801d10884';

describe('findAccountsByKey', () => {
  it("looks up the signer's own key and returns each account with its Miden address", async () => {
    const calls: string[] = [];
    const guardian = {
      setSigner: vi.fn(() => { calls.push('setSigner'); }),
      lookupAccountByKeyCommitment: vi.fn(async (commitment: string) => {
        calls.push(`lookup ${commitment}`);
        return { accounts: [{ accountId: id }] };
      }),
    };
    const signer = { commitment: '0xc0ffee' };
    const found = await findAccountsByKey(guardian as never, signer as never, 'mainnet');
    // The wallet signer signs the lookup, so it is set before the request.
    expect(calls).toEqual(['setSigner', 'lookup 0xc0ffee']);
    expect(guardian.setSigner).toHaveBeenCalledWith(signer);
    expect(found).toEqual([{ accountId: id, address: accountAddress(id, 'mainnet') }]);
  });

  it('returns no accounts when Guardian lists none', async () => {
    const guardian = { setSigner: vi.fn(), lookupAccountByKeyCommitment: vi.fn(async () => ({ accounts: [] })) };
    await expect(findAccountsByKey(guardian as never, { commitment: '0x1' } as never, 'mainnet')).resolves.toEqual([]);
  });
});

describe('accountAddress', () => {
  it.each([['mainnet', /^mm1/], ['testnet', /^mtst1/], ['devnet', /^mdev1/]] as const)(
    'gives the %s address, which converts back to the account ID',
    (network, prefix) => {
      const address = accountAddress(id, network);
      expect(address).toMatch(prefix);
      // The account itself: no routing parameters, so two accounts differ at the end.
      expect(address).not.toContain('_');
      expect(toHexAccountId(address)).toBe(id);
    },
  );
});

describe('accountIdFromInput', () => {
  it.each([
    ['a Miden address', accountAddress(id, 'mainnet')],
    // As the dashboard copies it, with routing parameters.
    ['a Miden address with routing parameters', AccountId.fromHex(id).toBech32(NetworkId.mainnet(), AccountInterface.BasicWallet)],
    ['a hex ID', id],
    // Starts like an address ("deadc" then "1"), but it is hex.
    ['a hex ID without 0x', id.slice(2)],
    ['padded upper-case hex', `  ${id.toUpperCase().replace('0X', '0x')}  `],
  ])('loads from %s', (_, input) => {
    expect(accountIdFromInput(input, 'mainnet')).toBe(id);
  });

  it("refuses another network's address, in either case", () => {
    expect(() => accountIdFromInput(accountAddress(id, 'testnet'), 'mainnet'))
      .toThrow('This is a testnet address. This app is on mainnet.');
    expect(() => accountIdFromInput(accountAddress(id, 'testnet').toUpperCase(), 'mainnet'))
      .toThrow('This is a testnet address. This app is on mainnet.');
    expect(() => accountIdFromInput(accountAddress(id, 'mainnet'), 'testnet'))
      .toThrow('This is a mainnet address. This app is on testnet.');
  });

  it('says what to enter for anything else, including hex that is not an account ID', () => {
    // The signer chip's "Public key commitment" is hex too, but 32 bytes.
    const keyCommitment = '0xd4df8cfb4461b8feba3d39e2976de802d32514f16195e345a6d48a5cc4029ee7';
    for (const input of ['hello', 'mm1notanaddress', '0xzz', 'abc', keyCommitment]) {
      expect(() => accountIdFromInput(input, 'mainnet')).toThrow('Enter a Miden address (mm1…) or an account ID (0x…)');
    }
  });
});

describe('lookupErrorMessage', () => {
  const guardianError = (status: number, message: string) =>
    new GuardianHttpError(status, 'Unauthorized', JSON.stringify({ code: 'authentication_failed', message, meta: { retryable: false } }));

  it('names a clock that is off', () => {
    expect(lookupErrorMessage(guardianError(401, 'Request timestamp outside allowed window: 400000ms drift (max 300000ms)')))
      .toBe('Your device clock is off. Fix it and try again.');
  });

  it('reports any other refused signature', () => {
    expect(lookupErrorMessage(guardianError(401, 'signature key does not derive to the queried key_commitment')))
      .toBe("Guardian couldn't verify the signature");
  });

  it('turns a declined wallet prompt and an unreachable Guardian into one short line', () => {
    // The Miden Wallet's answer to a declined signature, through its adapter.
    expect(lookupErrorMessage(Object.assign(new Error('NOT_GRANTED'), { name: 'WalletTransactionError' }))).toBe('Signature declined');
    expect(lookupErrorMessage(new Error('User rejected the request'))).toBe('Signature declined');
    expect(lookupErrorMessage(new Error('Ledger: denied by the user (0x6985)'))).toBe('Signature declined');
    expect(lookupErrorMessage(new TypeError('Failed to fetch'))).toBe('Guardian is unreachable. Try again.');
    expect(lookupErrorMessage(new Error('Something else'))).toBe('Something else');
  });
});

describe('isWalletDecline', () => {
  it('knows each wallet\'s decline, and nothing else', () => {
    for (const declined of ['NOT_GRANTED', 'User rejected the request', 'user cancelled', 'Condition of use not satisfied (denied by the user?) (0x6985)']) {
      expect(isWalletDecline(new Error(declined))).toBe(true);
    }
    // A wrong network, a node refusal or a timeout is not the user declining.
    for (const other of ['NETWORK_NOT_GRANTED', 'Transaction rejected by the node', 'Ledger operation cancelled. Please retry when ready.']) {
      expect(isWalletDecline(new Error(other))).toBe(false);
    }
  });

  it('is what classifyWalletError reports as a cancellation', () => {
    expect(classifyWalletError(new Error('NOT_GRANTED'))).toBe('Signing was cancelled');
    expect(classifyWalletError(new Error('NETWORK_NOT_GRANTED'))).toBe('NETWORK_NOT_GRANTED');
  });
});

describe('accountLookupRunner', () => {
  const found = [{ accountId: id, address: 'mm1example' }];
  function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  }

  it('says it is starting, then asking the wallet, then shows the accounts', async () => {
    const states: AccountLookup['phase'][] = [];
    const runner = accountLookupRunner((state) => { states.push(state.phase); });
    await runner.run(async (onAsk) => { onAsk(); return found; });
    expect(states).toEqual(['starting', 'asking', 'found']);
  });

  it('reports none found and failures as one line', async () => {
    const states: AccountLookup[] = [];
    const runner = accountLookupRunner((state) => { states.push(state); });
    await runner.run(async () => []);
    await runner.run(async () => { throw new Error('NOT_GRANTED'); });
    expect(states.filter((s) => s.phase === 'none' || s.phase === 'failed')).toEqual([
      { phase: 'none' },
      { phase: 'failed', message: 'Signature declined' },
    ]);
  });

  it("drops a lookup's late answer after another wallet connected", async () => {
    const states: AccountLookup[] = [];
    const runner = accountLookupRunner((state) => { states.push(state); });
    const answer = deferred<typeof found>();
    const running = runner.run(() => answer.promise);
    runner.reset();
    answer.resolve(found);
    await running;
    expect(states.at(-1)).toEqual({ phase: 'idle' });
    expect(states.some((s) => s.phase === 'found')).toBe(false);
  });

  it('keeps only the newest of two lookups', async () => {
    const states: AccountLookup[] = [];
    const runner = accountLookupRunner((state) => { states.push(state); });
    const first = deferred<typeof found>();
    const firstRun = runner.run(() => first.promise);
    const secondRun = runner.run(async () => []);
    await secondRun;
    first.resolve(found);
    await firstRun;
    expect(states.at(-1)).toEqual({ phase: 'none' });
  });
});

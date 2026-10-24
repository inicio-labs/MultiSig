import { describe, expect, it, vi } from 'vitest';
import { AccountId, AccountInterface, NetworkId } from '@miden-sdk/miden-sdk';
import { GuardianHttpError } from '@openzeppelin/guardian-client';
import { toHexAccountId } from '../../src/lib/helpers';
import { accountAddress, accountIdFromInput, findAccountsByKey, lookupErrorMessage } from '../../src/lib/findAccounts';

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

  it("refuses another network's address", () => {
    expect(() => accountIdFromInput(accountAddress(id, 'testnet'), 'mainnet'))
      .toThrow('This is a testnet address. This app is on mainnet.');
    expect(() => accountIdFromInput(accountAddress(id, 'mainnet'), 'testnet'))
      .toThrow('This is a mainnet address. This app is on testnet.');
  });

  it('says what to enter for anything else', () => {
    for (const input of ['hello', 'mm1notanaddress', '0xzz']) {
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
    expect(lookupErrorMessage(new Error('User rejected the request'))).toBe('Signature declined');
    expect(lookupErrorMessage(new Error('Ledger: denied by the user (0x6985)'))).toBe('Signature declined');
    expect(lookupErrorMessage(new TypeError('Failed to fetch'))).toBe('Guardian is unreachable. Try again.');
    expect(lookupErrorMessage(new Error('Something else'))).toBe('Something else');
  });
});

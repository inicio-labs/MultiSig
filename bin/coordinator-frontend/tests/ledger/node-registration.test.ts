import { afterEach, describe, expect, it, vi } from 'vitest';

// The RPC setting goes through the real config/psm.ts (so devnet/testnet are
// the resolved URLs and network identity, as in production). The direct RPC is
// mocked and records the URL and invitation code it was called with.
async function setup({ rpc = 'devnet', network, allowed = true, rpcError, userCode }: {
  rpc?: string; network?: string; allowed?: boolean; rpcError?: Error; userCode?: string;
} = {}) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_MIDEN_RPC_URL', rpc);
  if (network) vi.stubEnv('NEXT_PUBLIC_MIDEN_NETWORK', network);
  vi.stubEnv('NEXT_PUBLIC_MIDEN_REGISTRATION_CODE', 'guardian');
  const calls = { register: [] as Array<{ url: string; code: string }>, isAllowed: 0 };
  vi.doMock('../../src/lib/nodeRegistration', () => ({
    registerNodeAccount: async (url: string, _id: string, code: string) => {
      calls.register.push({ url, code });
      if (rpcError) throw rpcError;
    },
  }));
  const client = { accounts: { isAllowed: async () => { calls.isAllowed++; return allowed; } } };
  const { registerAccountOnNode } = await import('../../src/lib/multisigApi');
  return { run: () => registerAccountOnNode(client as never, '0x1234', userCode), calls };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock('../../src/lib/nodeRegistration');
});

describe('registerAccountOnNode', () => {
  it.each(['devnet', 'https://rpc.devnet.miden.io', 'https://rpc.devnet.miden.io:443/'])(
    'devnet (%s) registers with the invitation code (which funds the account), once for concurrent calls',
    async (rpc) => {
      const { run, calls } = await setup({ rpc });
      const first = run();
      expect(run()).toBe(first);
      await first;
      expect(calls.register).toEqual([{ url: expect.stringMatching(/^https:\/\/rpc\.devnet\.miden\.io/), code: 'guardian' }]);
      expect(calls.isAllowed).toBe(0);
    },
  );

  it.each(['testnet', 'https://rpc.testnet.miden.io'])(
    'testnet (%s) always registers, without an invitation code, even when the node allows every account',
    async (rpc) => {
      const { run, calls } = await setup({ rpc, allowed: true });
      await run();
      expect(calls.register).toEqual([{ url: 'https://rpc.testnet.miden.io', code: '' }]);
      expect(calls.isAllowed).toBe(0);
    },
  );

  it('mainnet registers with the code the account creator entered, and refuses without one', async () => {
    const withCode = await setup({ rpc: 'https://rpc.mainnet.example', network: 'mainnet', userCode: ' INVITE-123 ' });
    await withCode.run();
    expect(withCode.calls.register).toEqual([{ url: 'https://rpc.mainnet.example', code: 'INVITE-123' }]);
    const withoutCode = await setup({ rpc: 'https://rpc.mainnet.example', network: 'mainnet' });
    await expect(withoutCode.run()).rejects.toThrow(/invitation code is required/);
    expect(withoutCode.calls.register).toEqual([]);
  });

  it('testnet ignores a code the creator entered: it takes none', async () => {
    const { run, calls } = await setup({ rpc: 'testnet', userCode: 'something' });
    await run();
    expect(calls.register).toEqual([{ url: 'https://rpc.testnet.miden.io', code: '' }]);
  });

  it.each(['ALREADY_REGISTERED', 'account is already registered', 'ACCOUNT_ALREADY_ALLOWED'])(
    'accepts an existing registration (%s) only once the node allows the account',
    async (message) => {
      const accepted = await setup({ rpcError: new Error(message) });
      await accepted.run();
      expect(accepted.calls.isAllowed).toBe(1);
      const rejected = await setup({ rpcError: new Error(message), allowed: false });
      await expect(rejected.run()).rejects.toThrow(message);
    },
  );

  it('propagates real RPC errors and lets a failed request be retried', async () => {
    const error = new Error('funding service rejected account funding request');
    const { run, calls } = await setup({ rpc: 'testnet', rpcError: error });
    await expect(run()).rejects.toBe(error);
    await expect(run()).rejects.toBe(error);
    expect(calls.register).toHaveLength(2);
    expect(calls.isAllowed).toBe(0);
  });
});

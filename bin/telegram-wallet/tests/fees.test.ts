import { describe, expect, it } from 'vitest';
import { feeLabel } from '@/lib/fees';

describe('feeLabel', () => {
  it('says a dollar token’s fee in cents', () => {
    expect(feeLabel(130n, 6, 'USDCX')).toBe('under 1¢'); // today's testnet fee, 0.00013
    expect(feeLabel(10_000n, 6, 'USDCX')).toBe('1¢');
    expect(feeLabel(24_000n, 6, 'USDCX')).toBe('2¢');
    expect(feeLabel(995_000n, 6, 'USDCX')).toBe('$1.00');
    expect(feeLabel(1_204_000n, 6, 'USDCX')).toBe('$1.20');
  });

  it('says any other token’s fee as the token amount', () => {
    expect(feeLabel(1_500n, 6, 'MIDEN')).toBe('0.0015 MIDEN');
  });
});

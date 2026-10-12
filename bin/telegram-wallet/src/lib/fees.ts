import { formatTokenAmount } from './tokenAmounts';

/**
 * A fee in the words people use for money: "under 1¢", "2¢", "$1.20" for a
 * dollar token (USDCX), the token amount otherwise.
 */
export function feeLabel(units: bigint, decimals: number, symbol: string): string {
  if (!/USD/i.test(symbol) || decimals < 2) return `${formatTokenAmount(units, decimals)} ${symbol}`;
  const cent = 10n ** BigInt(decimals - 2);
  if (units < cent) return 'under 1¢';
  const cents = (units + cent / 2n) / cent;
  if (cents < 100n) return `${cents}¢`;
  return `$${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

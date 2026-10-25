'use client';

import Image from 'next/image';
import { TOKEN_LOGOS } from '@/config/tokenList/logos';
import { useToken, type TokenView } from '@/hooks/useToken';
import { formatTokenAmount, shortFaucetId } from '@/lib/tokenAmounts';

const UNVERIFIED_WHY = "Not on Miden's verified token list. Anyone can create a token with any name.";

/** The grey tag a token gets when Miden's verified list does not vouch for it. */
export function UnverifiedTag() {
  return (
    <span
      title={UNVERIFIED_WHY}
      className="inline-block whitespace-nowrap rounded-full bg-[rgba(0,0,0,0.06)] px-1.5 align-middle text-[10px] font-[500] leading-[16px] text-[rgba(0,0,0,0.55)]"
    >
      Unverified
    </span>
  );
}

/**
 * A listed token's logo (shipped with the app, or from the token list
 * repository for a token listed after this build), else its symbol's first letter.
 */
export function TokenLogo({ token, size = 24 }: { token: TokenView; size?: number }) {
  const logo = token.listed ? TOKEN_LOGOS[token.listed.faucetId] ?? token.listed.logoURI : undefined;
  if (logo) {
    return <Image src={logo} alt="" width={size} height={size} unoptimized className="shrink-0 rounded-full" />;
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      className="flex shrink-0 items-center justify-center rounded-full bg-[rgba(0,0,0,0.06)] font-[600] text-[rgba(0,0,0,0.55)]"
    >
      {token.symbol.slice(0, 1).toUpperCase()}
    </span>
  );
}

/**
 * An amount of one token, in that token's own decimals and symbol, tagged when
 * the token is unverified. When the token cannot be read it shows raw base
 * units and the faucet id: never a guessed scale or a well-known name, so an
 * unknown token cannot pose as one.
 */
export function TokenAmount({ faucetId, amount, className, showTag = true }: {
  faucetId: string;
  amount: bigint | string;
  className?: string;
  /** Off where the token's name next to it already carries the tag. */
  showTag?: boolean;
}) {
  const token = useToken(faucetId);
  if (token.status === 'ready' && token.info) {
    return (
      <span className={className}>
        {formatTokenAmount(amount, token.info.decimals)}
        {/* The symbol stays with the amount and is never split, even where the amount may break. */}
        <span className="whitespace-nowrap break-normal">{'\u00A0'}{token.symbol}</span>
        {showTag && token.verification === 'unverified' && <> <UnverifiedTag /></>}
      </span>
    );
  }
  if (token.status === 'error') {
    return (
      <span className={className} title={token.error ?? undefined}>
        {BigInt(amount).toString()} base units of {shortFaucetId(faucetId)}
      </span>
    );
  }
  return <span className={className}>…</span>;
}

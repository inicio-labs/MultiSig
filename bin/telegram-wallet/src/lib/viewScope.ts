/**
 * What this phone keeps per network (the saved home view, the first paint,
 * the account last used): a deployment that changes network must never show
 * the other network's balance as if it were here. Testnet keeps the unscoped
 * keys it always had. Light on purpose: firstPaint.ts reads it before any of
 * the app's code loads (the network name is fixed at build time).
 */
const NETWORK = (process.env.NEXT_PUBLIC_MIDEN_NETWORK ?? '').trim().toLowerCase();

export const VIEW_SCOPE = !NETWORK || NETWORK === 'testnet' ? '' : `${NETWORK}:`;

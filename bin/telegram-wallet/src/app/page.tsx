'use client';

import dynamic from 'next/dynamic';
import { InstantPreview } from '@/components/InstantPreview';

// The wallet is browser-only: the Miden SDK (WASM, IndexedDB), Privy and the
// Telegram bridge all need `window`. While its code loads, the last home
// screen this phone saw (or a splash).
const App = dynamic(() => import('@/components/App'), { ssr: false, loading: () => <InstantPreview /> });

export default function Page() {
  return <App />;
}

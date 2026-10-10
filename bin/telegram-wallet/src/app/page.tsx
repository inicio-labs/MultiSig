'use client';

import dynamic from 'next/dynamic';
import { Splash } from '@/components/Splash';

// The wallet is browser-only: the Miden SDK (WASM, IndexedDB), Privy and the
// Telegram bridge all need `window`.
const App = dynamic(() => import('@/components/App'), { ssr: false, loading: () => <Splash /> });

export default function Page() {
  return <App />;
}

'use client';

import { useEffect, useState } from 'react';
import { readFirstPaint } from '@/lib/firstPaint';
import { timeAgo } from '@/lib/timeAgo';
import { Icon } from './Icon';
import { Splash } from './Splash';

/**
 * The home screen as it last was (firstPaint.ts), painted while the wallet's
 * code loads and Telegram starts: same layout as WalletHome, nothing to tap
 * yet, "Updating…" on top. A splash when this phone has nothing saved.
 */
export function InstantPreview() {
  // Read after mounting: the page's first HTML (prerendered) is the splash.
  const [saved, setSaved] = useState<ReturnType<typeof readFirstPaint>>(null);
  useEffect(() => setSaved(readFirstPaint()), []);
  if (!saved) return <Splash />;
  const { paint, hidden } = saved;
  const blur = hidden ? ' amounts-hidden' : '';
  return (
    <>
      <header className="topbar">
        <span className="private-pill"><Icon name="lock" /> Private</span>
        <div className="updating" role="status"><span className="spin" />Updating…</div>
        <div className="topbar-actions">
          <span className="bell"><Icon name={hidden ? 'eyeOff' : 'eye'} /></span>
          <span className="bell"><Icon name="bell" /></span>
        </div>
      </header>
      <main className="home">
        <div>
          <div className="card-scene">
            <div className={`card${blur}`}>
              <div className="card-grain" />
              <div className="card-shine" />
              <div className="card-sweep" />
              <div className="card-balance amount-value"><span>{paint.balance}</span><small>{paint.symbol}</small></div>
              <div className="card-brand">Updated {timeAgo(paint.savedAt)}</div>
              {paint.name && <div className="card-name">{paint.name}</div>}
              <div className="card-addr"><span>{paint.address}</span></div>
            </div>
          </div>
        </div>
        <div className="actions">
          <span className="btn ink"><Icon name="receive" />Receive</span>
          <span className="btn"><Icon name="send" />Send</span>
        </div>
        <div className={`cells updating${blur}`}>
          <div className="cells-head">Activity</div>
          {paint.rows.length === 0 && <div className="empty">Your payments show up here.</div>}
          {paint.rows.map((row, i) => (
            <div key={i} className="cell">
              <span className="avatar"><Icon name={row.in ? 'receive' : 'send'} /></span>
              <span className="cell-main">
                <span className="cell-title">{row.in ? 'Received' : 'Sent'}</span>
                <span className="cell-sub">{row.sub}</span>
              </span>
              <span className={`cell-value amount-value${row.in ? ' in' : ''}`}>{row.value}</span>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

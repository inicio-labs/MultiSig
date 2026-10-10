export function Splash({ label }: { label?: string }) {
  return (
    <main className="screen">
      <div className="center">
        <div className="spinner" aria-hidden />
        {label && <p className="hint">{label}</p>}
      </div>
    </main>
  );
}

export function Fatal({ title, message, action }: { title: string; message: string; action?: { label: string; run(): void } }) {
  return (
    <main className="screen">
      <div className="center">
        <h1 className="title">{title}</h1>
        <p className="hint">{message}</p>
        {action && <button className="btn" style={{ maxWidth: 260 }} onClick={action.run}>{action.label}</button>}
      </div>
    </main>
  );
}

/** In-app back, for a normal browser: inside Telegram the native back button is used. */
export function BackLink({ onBack }: { onBack?: () => void }) {
  if (!onBack) return null;
  return (
    <button onClick={onBack} className="hint" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', alignSelf: 'flex-start' }}>
      ‹ Back
    </button>
  );
}

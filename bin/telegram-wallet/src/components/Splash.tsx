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
        {action && <button className="btn" style={{ maxWidth: 280 }} onClick={action.run}>{action.label}</button>}
      </div>
    </main>
  );
}


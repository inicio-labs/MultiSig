'use client';

/**
 * A number whose digits roll to their new value, like an odometer: each digit
 * is a 0–9 column that slides. Other characters (separators) render as is.
 */
export function RollingNumber({ value, className }: { value: string; className?: string }) {
  return (
    <span className={`roll ${className ?? ''}`} aria-label={value}>
      {[...value].map((ch, i) => (
        /\d/.test(ch) ? (
          <span key={`${value.length - i}`} className="roll-digit" aria-hidden>
            <span className="roll-col" style={{ transform: `translateY(-${Number(ch) * 10}%)` }}>
              {'0123456789'.split('').map((d) => <span key={d}>{d}</span>)}
            </span>
          </span>
        ) : (
          <span key={`${value.length - i}`} aria-hidden>{ch}</span>
        )
      ))}
    </span>
  );
}

'use client';

import { haptic } from '@/lib/telegram';
import { Icon } from './Icon';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'] as const;

/** Big-digit keypad: the phone keyboard would resize Telegram's webview mid-entry. */
export function Keypad({ value, decimals, onChange }: { value: string; decimals: number; onChange(next: string): void }) {
  const press = (key: (typeof KEYS)[number]) => {
    haptic('selection');
    if (key === 'del') return onChange(value.slice(0, -1));
    if (key === '.') {
      if (decimals === 0 || value.includes('.')) return;
      return onChange(`${value || '0'}.`);
    }
    const fraction = value.split('.')[1];
    if (fraction !== undefined && fraction.length >= decimals) return;
    if (value.replace('.', '').length >= 15) return;
    onChange(value === '0' ? key : value + key);
  };
  return (
    <div className="pad">
      {KEYS.map((key) => (
        <button key={key} onClick={() => press(key)} aria-label={key === 'del' ? 'Delete' : key}>
          {key === 'del' ? <Icon name="backspace" /> : key}
        </button>
      ))}
    </div>
  );
}

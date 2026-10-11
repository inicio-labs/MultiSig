'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

type ShowToast = (text: string, icon?: IconName) => void;
const ToastContext = createContext<ShowToast>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ text: string; icon: IconName; on: boolean }>({ text: '', icon: 'check', on: false });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback<ShowToast>((text, icon = 'check') => {
    clearTimeout(timer.current);
    setToast({ text, icon, on: true });
    timer.current = setTimeout(() => setToast((t) => ({ ...t, on: false })), 2600);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={`toast${toast.on ? ' on' : ''}`} role="status" aria-live="polite">
        <span className="ico"><Icon name={toast.icon} /></span>
        <span>{toast.text}</span>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = (): ShowToast => useContext(ToastContext);

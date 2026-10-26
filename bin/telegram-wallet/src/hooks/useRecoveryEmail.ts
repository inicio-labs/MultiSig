'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getWasmOrThrow } from '@miden-sdk/miden-sdk';
import type { Signer } from '@openzeppelin/miden-multisig-client';
import type { Hex } from 'viem';
import { formatError } from '@/lib/errors';
import { createPrivySigner, type RawHashProvider } from '@/lib/privySigner';
import { recoveryEmailSource, type BoxMessage, type EmailBoxState, type WalletMessage } from '@/lib/recoveryFrame';

// The box has not said anything by then: "Couldn't load".
const LOAD_TIMEOUT_MS = 15_000;
const SIGN_TIMEOUT_MS = 120_000;

/**
 * The recovery email box (recoveryFrame.ts) seen from the wallet: what its
 * field shows, the email key once signed in (a signer whose signatures the
 * box makes), and the sheet's buttons.
 */
export function useRecoveryEmail() {
  const frame = useRef<HTMLIFrameElement>(null);
  const { src, origin } = useMemo(() => recoveryEmailSource(), []);
  const [state, setState] = useState<EmailBoxState | null>(null);
  const [key, setKey] = useState<{ signer: Signer; email: string } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const pending = useRef(new Map<number, { resolve(signature: string): void; reject(error: Error): void }>());
  const nextId = useRef(1);
  const heard = useRef(false);

  const send = useCallback((message: WalletMessage) => {
    frame.current?.contentWindow?.postMessage(message, origin);
  }, [origin]);

  useEffect(() => {
    const onMessage = (event: MessageEvent<BoxMessage>) => {
      if (event.origin !== origin || event.source !== frame.current?.contentWindow) return;
      const message = event.data;
      heard.current = true;
      if (message?.type === 'state') {
        const { type: _type, ...next } = message;
        setState(next);
        setFailed(null);
      } else if (message?.type === 'email-key') {
        const provider: RawHashProvider = {
          request: ({ params }) => new Promise((resolve, reject) => {
            const id = nextId.current++;
            pending.current.set(id, { resolve, reject });
            send({ type: 'sign', id, hash: (params as [Hex])[0] });
            setTimeout(() => {
              if (pending.current.delete(id)) reject(new Error('The recovery email did not answer.'));
            }, SIGN_TIMEOUT_MS);
          }),
        };
        void getWasmOrThrow()
          .then(() => createPrivySigner({ address: message.address, publicKey: message.publicKey, provider }))
          .then(({ signer }) => setKey({ signer, email: message.email }))
          .catch((e: unknown) => setFailed(`Couldn’t read the recovery email key: ${formatError(e)}`));
      } else if (message?.type === 'signed') {
        const waiter = pending.current.get(message.id);
        if (!waiter) return;
        pending.current.delete(message.id);
        if (message.signature) waiter.resolve(message.signature);
        else waiter.reject(new Error(message.error ?? 'The recovery email refused to sign.'));
      }
    };
    window.addEventListener('message', onMessage);
    const timer = setTimeout(() => {
      if (!heard.current) setFailed('Couldn’t load. Check your connection and try again.');
    }, LOAD_TIMEOUT_MS);
    return () => {
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
    };
  }, [origin, send]);

  return {
    frame,
    src,
    state,
    key,
    failed,
    submit: () => send({ type: 'submit' }),
    resend: () => send({ type: 'resend' }),
    change: () => {
      setKey(null);
      send({ type: 'change' });
    },
  };
}

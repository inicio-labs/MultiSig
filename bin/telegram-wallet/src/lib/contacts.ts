'use client';

import { useEffect, useState } from 'react';
import { storage } from './storage';

/**
 * People this wallet paid by Telegram name, kept on this phone only (never on
 * a server): address → name. Activity, Send's suggestions and recents, and
 * the receipt show "@alex" instead of an address. Saved after a send to a
 * Telegram-verified directory entry (directory.ts).
 */
export interface Contact {
  /** Miden account id, hex, lowercase. */
  address: string;
  name: string;
  username: string | null;
  savedAt: number;
}

export type Contacts = Record<string, Contact>;

const KEY = 'miden-tg-wallet:contacts:';
const listeners = new Set<() => void>();

export function loadContacts(accountId: string | null): Contacts {
  if (!accountId) return {};
  try {
    return JSON.parse(storage.get(KEY + accountId.toLowerCase()) ?? '{}') as Contacts;
  } catch {
    return {};
  }
}

export function saveContact(accountId: string, contact: Omit<Contact, 'savedAt'>): void {
  const all = loadContacts(accountId);
  all[contact.address.toLowerCase()] = { ...contact, address: contact.address.toLowerCase(), savedAt: Date.now() };
  storage.set(KEY + accountId.toLowerCase(), JSON.stringify(all));
  for (const listener of listeners) listener();
}

/** "@alex", or the name when they have no username. */
export const contactLabel = (contact: Contact): string => (contact.username ? `@${contact.username}` : contact.name);

/** The contact for an address, if this wallet paid them by name. */
export const contactFor = (contacts: Contacts, address: string | undefined): Contact | undefined =>
  address ? contacts[address.toLowerCase()] : undefined;

/** Contacts whose name or username contains what was typed (an @ is ignored), newest first. */
export function matchContacts(contacts: Contacts, typed: string, limit = 4): Contact[] {
  const query = typed.trim().replace(/^@/, '').toLowerCase();
  if (!query) return [];
  return Object.values(contacts)
    .filter((c) => c.username?.toLowerCase().includes(query) || c.name.toLowerCase().includes(query))
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, limit);
}

/** This wallet's contacts, kept current when one is saved. */
export function useContacts(accountId: string | null): Contacts {
  const [contacts, setContacts] = useState<Contacts>(() => loadContacts(accountId));
  useEffect(() => {
    const update = () => setContacts(loadContacts(accountId));
    update();
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, [accountId]);
  return contacts;
}

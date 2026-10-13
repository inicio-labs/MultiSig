import { describe, expect, it } from 'vitest';
import { contactFor, contactLabel, matchContacts, type Contacts } from '@/lib/contacts';

const contacts: Contacts = {
  '0xaaa': { address: '0xaaa', name: 'Alex Park', username: 'alexp', savedAt: 2 },
  '0xbbb': { address: '0xbbb', name: 'Alina', username: null, savedAt: 3 },
  '0xccc': { address: '0xccc', name: 'Sam', username: 'samwise', savedAt: 1 },
};

describe('contacts', () => {
  it('suggests people by part of their name or username, newest first', () => {
    expect(matchContacts(contacts, 'al').map((c) => c.address)).toEqual(['0xbbb', '0xaaa']);
    expect(matchContacts(contacts, '@sam').map((c) => c.address)).toEqual(['0xccc']);
    expect(matchContacts(contacts, '')).toEqual([]);
  });

  it('labels by username, else name; finds by address in any case', () => {
    expect(contactLabel(contacts['0xaaa'])).toBe('@alexp');
    expect(contactLabel(contacts['0xbbb'])).toBe('Alina');
    expect(contactFor(contacts, '0xAAA')?.name).toBe('Alex Park');
    expect(contactFor(contacts, undefined)).toBeUndefined();
  });
});

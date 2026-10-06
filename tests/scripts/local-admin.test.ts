import { describe, expect, it } from 'vitest';

import { applyMaskedInput, hasNonAsciiCharacters, initialMaskedInput } from '../../scripts/local-admin/masked-input';
import { parseLocalAdminArgs, planLocalAdminWrite } from '../../scripts/local-admin/plan';
import { assertLocalDatabase } from '../../scripts/local-database-target';

const now = new Date('2026-10-06T10:00:00Z');

describe('local admin setup', () => {
  it('normalizes the email the way login does and keeps an optional name', () => {
    expect(parseLocalAdminArgs(['--email=  Owner@Example.COM ', '--name=Owner'])).toEqual({ email: 'owner@example.com', name: 'Owner' });
    expect(parseLocalAdminArgs(['--email=owner@example.com'])).toEqual({ email: 'owner@example.com', name: null });
  });

  it.each([
    ['no email', []],
    ['an invalid email', ['--email=owner']],
    ['a password on the command line', ['--email=owner@example.com', '--password=secret']],
  ])('refuses %s', (_, argv) => {
    expect(() => parseLocalAdminArgs(argv)).toThrow();
  });

  it('creates a verified admin when the email is new', () => {
    const plan = planLocalAdminWrite(null, { email: 'owner@example.com', name: null, passwordHash: 'hash', now, newId: 'new-id' });
    expect(plan).toEqual({
      action: 'insert',
      values: expect.objectContaining({ id: 'new-id', email: 'owner@example.com', name: 'owner', role: 'admin', passwordHash: 'hash', emailVerifiedAt: now }),
    });
  });

  it('promotes an existing account, signs out its old sessions and clears any reset token', () => {
    const plan = planLocalAdminWrite(
      { id: 'user-1', name: 'Existing', emailVerifiedAt: null, sessionVersion: 3 },
      { email: 'owner@example.com', name: null, passwordHash: 'hash', now, newId: 'unused' },
    );
    expect(plan).toEqual({
      action: 'update',
      id: 'user-1',
      values: expect.objectContaining({
        name: 'Existing', role: 'admin', passwordHash: 'hash', sessionVersion: 4,
        resetToken: null, resetExpires: null, deactivatedAt: null, emailVerifiedAt: now,
      }),
    });
  });

  it('masks typed and pasted characters with "*" and finishes on Enter', () => {
    const typed = applyMaskedInput(initialMaskedInput, 'abc');
    expect(typed).toEqual({ state: { value: 'abc', done: false, cancelled: false }, echo: '***' });
    const pasted = applyMaskedInput(typed.state, 'def\r');
    expect(pasted).toEqual({ state: { value: 'abcdef', done: true, cancelled: false }, echo: '***' });
  });

  it('handles backspace, ignores arrow keys, and cancels on Ctrl+C', () => {
    const edited = applyMaskedInput(initialMaskedInput, 'ab\u007fc\u001b[Dd\u001bOA\r');
    expect(edited.state).toEqual({ value: 'acd', done: true, cancelled: false });
    expect(edited.echo).toBe('**\b \b**');
    expect(applyMaskedInput(initialMaskedInput, '\u007f').echo).toBe('');
    expect(applyMaskedInput({ value: 'secret', done: false, cancelled: false }, '\u0003').state)
      .toEqual({ value: '', done: true, cancelled: true });
  });

  it('flags passwords typed with a non-English keyboard layout', () => {
    expect(hasNonAsciiCharacters('correct horse battery staple')).toBe(false);
    expect(hasNonAsciiCharacters('ฟหกดเ่าสวงฟหกดเ')).toBe(true);
  });

  it('runs only against a MySQL server on this machine', () => {
    expect(() => assertLocalDatabase('mysql://root@localhost:3306/milerdev', 'development', 'Local admin setup')).not.toThrow();
    expect(() => assertLocalDatabase('mysql://user@db.example.com/milerdev', 'development', 'Local admin setup')).toThrow(/this machine/);
    expect(() => assertLocalDatabase('mysql://root@localhost/milerdev', 'production', 'Local admin setup')).toThrow(/production/);
  });
});

import { describe, expect, it } from 'vitest';
import { getPasswordPolicyError } from '@/lib/password-policy';
describe('new password policy', () => {
  it.each(['\u1100\u1161\u11a8'.repeat(128), 'a'.repeat(15), 'ก'.repeat(128), '🔐'.repeat(128), 'a long passphrase with spaces', 'e\u0301'.repeat(15)])('accepts full Unicode passphrases: %s', (value) => {
    expect(getPasswordPolicyError(value)).toBe('');
  });
  it.each(['short', 'a'.repeat(129), '🔐'.repeat(129), 'a'.repeat(15) + '\u0000', 'a'.repeat(15) + '\ud800'])('rejects invalid input', (value) => {
    expect(getPasswordPolicyError(value)).not.toBe('');
  });
});

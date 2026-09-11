import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { hashNewPassword, verifyPassword } from '@/lib/password-storage';
import { assertPasswordNotCompromised } from '@/lib/password-screening';
import { PasswordSecurityError } from '@/lib/password-errors';
vi.mock('@/lib/password-screening', () => ({ assertPasswordNotCompromised: vi.fn() }));
beforeEach(() => { vi.mocked(assertPasswordNotCompromised).mockReset().mockResolvedValue(undefined); });

describe('password storage boundary', () => {
  it('authenticates the entire password beyond bcrypt’s 72-byte boundary', async () => {
    const prefix = 'Aa1' + 'ก'.repeat(23);
    expect(Buffer.byteLength(prefix)).toBe(72);
    const chosen = prefix + 'X';
    const different = prefix + 'Y';
    const legacy = await bcrypt.hash(chosen, 4);
    expect(await bcrypt.compare(different, legacy)).toBe(true); // original reproduction
    const stored = await hashNewPassword(chosen);
    expect(stored.split('$').slice(1, 3)).toEqual(['argon2id', 'v=19']);
    expect(stored.split('$')[3].split(',').sort()).toEqual(['m=19456', 'p=1', 't=2']);
    expect(await verifyPassword(chosen, stored)).toBe(true);
    expect(await verifyPassword(different, stored)).toBe(false);
    expect(await verifyPassword(prefix, stored)).toBe(false);
  });
  it('supports 128 Unicode code points and preserves spaces', async () => {
    const password = ' 🔐' + 'ก'.repeat(124) + ' ';
    const stored = await hashNewPassword(password);
    expect(await verifyPassword(password, stored)).toBe(true);
    expect(await verifyPassword(password.trim(), stored)).toBe(false);
  });
  it('screens and verifies the same NFC-normalized representation', async () => {
    const decomposed = 'e\u0301'.repeat(15);
    const stored = await hashNewPassword(decomposed);
    expect(assertPasswordNotCompromised).toHaveBeenCalledWith('é'.repeat(15));
    expect(await verifyPassword('é'.repeat(15), stored)).toBe(true);
    expect(await verifyPassword(decomposed, stored)).toBe(true);
  });
  it('keeps legacy short/raw Unicode passwords usable without screening or migration', async () => {
    const password = 'e\u0301Aa1!';
    const stored = await bcrypt.hash(password, 4);
    expect(await verifyPassword(password, stored)).toBe(true);
    expect(await verifyPassword(password.normalize('NFC'), stored)).toBe(false);
    expect(await verifyPassword('wrong', stored)).toBe(false);
    expect(assertPasswordNotCompromised).not.toHaveBeenCalled();
  });
  it('documents legacy truncation until an explicit reset replaces the digest', async () => {
    const prefix = 'a'.repeat(72);
    const stored = await bcrypt.hash(prefix + 'legacy suffix', 4);
    expect(await verifyPassword(prefix + 'different suffix', stored)).toBe(true);
    expect(assertPasswordNotCompromised).not.toHaveBeenCalled();
  });
  it('rejects invalid new passwords before external work', async () => {
    await expect(hashNewPassword('short')).rejects.toMatchObject({ kind: 'policy' });
    expect(assertPasswordNotCompromised).not.toHaveBeenCalled();
  });
  it.each(['compromised', 'screening_unavailable'] as const)('cannot mint a digest when screening returns %s', async (kind) => {
    vi.mocked(assertPasswordNotCompromised).mockRejectedValue(new PasswordSecurityError(kind, 'Unavailable'));
    await expect(hashNewPassword('a valid long passphrase')).rejects.toMatchObject({ kind });
  });
  it.each(['', '$argon2id$malformed', '$2b$12$malformed', '$unknown$'])('fails closed for invalid stored formats', async (stored) => {
    expect(await verifyPassword('a valid long passphrase', stored)).toBe(false);
  });
});

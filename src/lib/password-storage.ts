import argon2 from 'argon2';
import bcrypt from 'bcryptjs';
import { getPasswordPolicyError } from './password-policy';
import { assertPasswordNotCompromised } from './password-screening';
import { PasswordSecurityError } from './password-errors';

export async function hashNewPassword(password: string): Promise<string> {
  const error = getPasswordPolicyError(password);
  if (error) throw new PasswordSecurityError('policy', error);
  const normalized = password.normalize('NFC');
  await assertPasswordNotCompromised(normalized);
  return argon2.hash(normalized, {
    type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1, hashLength: 32,
  });
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  try {
    if (passwordHash.startsWith('$argon2id$')) {
      // Verification must not impose today's creation policy on existing hashes.
      if (password.length > 4096) return false;
      return await argon2.verify(passwordHash, password.normalize('NFC'));
    }
    if (/^\$2[aby]\$/.test(passwordHash)) {
      // Legacy compatibility: bcrypt proves at most the first 72 bytes.
      // Never upgrade on login: the historical suffix cannot be authenticated.
      // An explicit password change/reset replaces this historical verifier.
      return await bcrypt.compare(password, passwordHash);
    }
    return false;
  } catch {
    return false;
  }
}

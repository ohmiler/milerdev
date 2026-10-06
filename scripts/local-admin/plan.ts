import type { NewUser, User } from '../../src/lib/db/schema';

export type LocalAdminOptions = { email: string; name: string | null };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Reads `--email=... [--name=...]`. Login lowercases and trims emails, so this does too. */
export function parseLocalAdminArgs(argv: string[]): LocalAdminOptions {
  let email = '';
  let name: string | null = null;
  for (const arg of argv) {
    if (arg.startsWith('--email=')) email = arg.slice('--email='.length).toLowerCase().trim();
    else if (arg.startsWith('--name=')) name = arg.slice('--name='.length).trim() || null;
    else throw new Error(`Unknown option: ${arg}`);
  }
  if (!EMAIL.test(email)) throw new Error('Pass the admin email: npm run db:local-admin -- --email=you@example.com');
  if (name && name.length > 255) throw new Error('--name must be at most 255 characters');
  return { email, name };
}

type ExistingUser = Pick<User, 'id' | 'name' | 'emailVerifiedAt' | 'sessionVersion'>;

export type LocalAdminWrite =
  | { action: 'insert'; values: NewUser & { id: string } }
  | { action: 'update'; id: string; values: Partial<NewUser> };

/**
 * Makes the account an active, verified admin with the new password. Like a password change
 * on the site, it clears any reset token and bumps sessionVersion to sign out old sessions.
 */
export function planLocalAdminWrite(
  existing: ExistingUser | null,
  input: LocalAdminOptions & { passwordHash: string; now: Date; newId: string },
): LocalAdminWrite {
  if (!existing) {
    return {
      action: 'insert',
      values: {
        id: input.newId,
        email: input.email,
        name: input.name ?? input.email.split('@')[0],
        passwordHash: input.passwordHash,
        role: 'admin',
        emailVerifiedAt: input.now,
        createdAt: input.now,
        updatedAt: input.now,
      },
    };
  }
  return {
    action: 'update',
    id: existing.id,
    values: {
      name: input.name ?? existing.name,
      passwordHash: input.passwordHash,
      role: 'admin',
      resetToken: null,
      resetExpires: null,
      deactivatedAt: null,
      emailVerifiedAt: existing.emailVerifiedAt ?? input.now,
      sessionVersion: existing.sessionVersion + 1,
      updatedAt: input.now,
    },
  };
}

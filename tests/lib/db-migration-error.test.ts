import { describe, expect, it } from 'vitest';

import { getSafeMigrationFailureMessage } from '@/lib/db/migration-error';

describe('migration error logging', () => {
    it('keeps a safe database error code without exposing query data', () => {
        const error = {
            query: 'ALTER TABLE accounts ADD UNIQUE(provider, providerAccountId)',
            cause: {
                code: 'ER_DUP_ENTRY',
                sqlMessage: "Duplicate entry 'google-sensitive-provider-id'",
            },
        };

        const message = getSafeMigrationFailureMessage(error);

        expect(message).toBe('Migration failed (ER_DUP_ENTRY)');
        expect(message).not.toContain('google-sensitive-provider-id');
        expect(message).not.toContain('ALTER TABLE');
    });

    it('falls back to a generic message for untrusted error codes', () => {
        const error = {
            code: 'bad code: secret-value',
            message: 'secret-value',
        };

        expect(getSafeMigrationFailureMessage(error)).toBe('Migration failed');
    });

    it('handles non-object failures without stringifying them', () => {
        expect(getSafeMigrationFailureMessage('secret-value')).toBe('Migration failed');
    });
});

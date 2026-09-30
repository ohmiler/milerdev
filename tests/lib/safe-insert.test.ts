import { describe, it, expect } from 'vitest';
import { DrizzleQueryError } from 'drizzle-orm';
import { isDuplicateKeyError } from '@/lib/db/safe-insert';

describe('isDuplicateKeyError', () => {
    it('detects MySQL duplicate entry error', () => {
        const err = new Error("Duplicate entry 'abc-xyz' for key 'uq_enrollment_user_course'");
        expect(isDuplicateKeyError(err)).toBe(true);
    });

    it('detects ER_DUP_ENTRY code', () => {
        const err = new Error('ER_DUP_ENTRY: Duplicate entry');
        expect(isDuplicateKeyError(err)).toBe(true);
    });

    it('detects UNIQUE constraint error (SQLite)', () => {
        const err = new Error('UNIQUE constraint failed: enrollments.user_id, enrollments.course_id');
        expect(isDuplicateKeyError(err)).toBe(true);
    });

    it('returns false for other errors', () => {
        expect(isDuplicateKeyError(new Error('Connection refused'))).toBe(false);
        expect(isDuplicateKeyError(new Error('Timeout'))).toBe(false);
    });

    it('returns false for non-Error values', () => {
        expect(isDuplicateKeyError(null)).toBe(false);
        expect(isDuplicateKeyError(undefined)).toBe(false);
        expect(isDuplicateKeyError('string')).toBe(false);
        expect(isDuplicateKeyError(42)).toBe(false);
    });
});

it('recognizes the actual Drizzle wrapper used when Stripe replays an existing enrollment', () => {
    const mysql = Object.assign(new Error('duplicate key'), { code: 'ER_DUP_ENTRY', errno: 1062 });
    expect(isDuplicateKeyError(new DrizzleQueryError('fixture insert', [], mysql))).toBe(true);
});
it('does not mistake query parameters in a Drizzle wrapper for a duplicate-key error', () => {
    const mysql = Object.assign(new Error('connection unavailable'), { code: 'ECONNREFUSED' });
    expect(isDuplicateKeyError(new DrizzleQueryError('fixture insert', ['Duplicate entry'], mysql))).toBe(false);
});

it('terminates cyclic causes and keeps non-duplicate driver errors visible', () => {
    const cyclic = new Error('query'); cyclic.cause = cyclic;
    expect(isDuplicateKeyError(cyclic)).toBe(false);
    expect(isDuplicateKeyError(Object.assign(new Error('Duplicate entry in a query parameter'), { code: 'ER_NO_REFERENCED_ROW_2' }))).toBe(false);
});

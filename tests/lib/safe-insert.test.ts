import { describe, it, expect } from 'vitest';
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

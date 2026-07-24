import { describe, expect, it } from 'vitest';

import {
    parseUserLifecycleSmokeTarget,
    validateUserLifecycleSmokePassword,
} from '../../scripts/user-lifecycle-smoke-target';

describe('user lifecycle smoke target guard', () => {
    it('accepts only the authorized local milerdev target', () => {
        expect(parseUserLifecycleSmokeTarget(
            'mysql://user:password@localhost:3306/milerdev',
        )).toEqual({
            database: 'milerdev',
            hostname: 'localhost',
            port: 3306,
        });
    });

    it.each([
        'mysql://user:password@example.com:3306/milerdev',
        'mysql://user:password@localhost:3307/milerdev',
        'mysql://user:password@localhost:3306/milerdev_lifecycle_fresh',
        'postgres://user:password@localhost:3306/milerdev',
    ])('rejects unauthorized target %s', (databaseUrl) => {
        expect(() => parseUserLifecycleSmokeTarget(databaseUrl)).toThrow();
    });

    it('requires passwords matching the credential policy', () => {
        expect(() => validateUserLifecycleSmokePassword('Valid123')).not.toThrow();
        expect(() => validateUserLifecycleSmokePassword('short1A')).toThrow();
        expect(() => validateUserLifecycleSmokePassword('lowercase1')).toThrow();
        expect(() => validateUserLifecycleSmokePassword('UPPERCASE1')).toThrow();
        expect(() => validateUserLifecycleSmokePassword('NoNumberHere')).toThrow();
    });
});
import { describe, expect, it } from 'vitest';

import {
    classifyUpgradeVerificationCheckpoint,
    parseUserLifecycleRehearsalTarget,
    type UserLifecycleRehearsalMode,
} from '../../scripts/user-lifecycle-rehearsal-target';

describe('user lifecycle rehearsal target guard', () => {
    it.each<[UserLifecycleRehearsalMode, string]>([
        ['fresh', 'milerdev_lifecycle_fresh'],
        ['upgrade-base', 'milerdev_lifecycle_upgrade'],
        ['inspect-upgrade', 'milerdev_lifecycle_upgrade'],
        ['verify-upgrade', 'milerdev_lifecycle_upgrade'],
        ['upgrade-lifecycle', 'milerdev_lifecycle_upgrade'],
    ])('accepts the authorized local target for %s', (mode, database) => {
        expect(parseUserLifecycleRehearsalTarget(
            `mysql://operator:secret@localhost:3306/${database}`,
            mode,
        )).toEqual({
            database,
            hostname: 'localhost',
            port: 3306,
        });
    });

    it.each([
        ['mysql://operator:secret@localhost:3306/milerdev', 'protected or unauthorized schema'],
        ['mysql://operator:secret@example.com:3306/milerdev_lifecycle_fresh', 'local MySQL server'],
        ['mysql://operator:secret@localhost:3307/milerdev_lifecycle_fresh', 'port 3306'],
        ['postgres://operator:secret@localhost:3306/milerdev_lifecycle_fresh', 'MySQL URL'],
    ])('rejects an unsafe target without echoing its URL', (databaseUrl, message) => {
        expect(() => parseUserLifecycleRehearsalTarget(databaseUrl, 'fresh'))
            .toThrow(message);

        try {
            parseUserLifecycleRehearsalTarget(databaseUrl, 'fresh');
        } catch (error) {
            expect(String(error)).not.toContain(databaseUrl);
            expect(String(error)).not.toContain('secret');
        }
    });
});

describe('upgrade verification checkpoint', () => {
    it('distinguishes ready, completed duplicate, and inconsistent states', () => {
        expect(classifyUpgradeVerificationCheckpoint({
            activeAdminCount: 2,
            inactiveAdminCount: 0,
            adminLifecycleAuditCount: 0,
        })).toBe('ready');
        expect(classifyUpgradeVerificationCheckpoint({
            activeAdminCount: 2,
            inactiveAdminCount: 0,
            adminLifecycleAuditCount: 2,
        })).toBe('complete');
        expect(classifyUpgradeVerificationCheckpoint({
            activeAdminCount: 2,
            inactiveAdminCount: 0,
            adminLifecycleAuditCount: 4,
        })).toBe('complete');
        expect(classifyUpgradeVerificationCheckpoint({
            activeAdminCount: 1,
            inactiveAdminCount: 1,
            adminLifecycleAuditCount: 1,
        })).toBe('invalid');
    });
});

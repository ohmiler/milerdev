import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/mysql-core';

import { users } from '@/lib/db/schema';

describe('user lifecycle schema contract', () => {
    it('keeps deactivation nullable and indexed without changing existing-user defaults', () => {
        const config = getTableConfig(users);
        const deactivatedAt = config.columns.find(
            (column) => column.name === 'deactivated_at'
        );
        const lifecycleIndex = config.indexes.find(
            (candidate) => candidate.config.name === 'idx_users_deactivated_at'
        );

        expect(deactivatedAt?.notNull).toBe(false);
        expect(deactivatedAt?.hasDefault).toBe(false);
        expect(lifecycleIndex?.config.unique).toBe(false);
        expect(lifecycleIndex?.config.columns).toEqual([deactivatedAt]);
    });

    it('adds only the nullable lifecycle column and its index in migration 0012', () => {
        const migration = readFileSync(
            resolve(process.cwd(), 'drizzle/0012_user_lifecycle.sql'),
            'utf8'
        );

        expect(migration).toMatch(
            /ALTER TABLE `users` ADD `deactivated_at` datetime;/
        );
        expect(migration).toMatch(
            /CREATE INDEX `idx_users_deactivated_at` ON `users` \(`deactivated_at`\);/
        );
        expect(migration).not.toMatch(/`deactivated_at`[^;]*(NOT NULL|DEFAULT)/i);
        expect(migration).not.toMatch(/^\s*(DROP|DELETE|UPDATE|RENAME|TRUNCATE)\b/im);
        expect(migration.match(/;\s*(?:-->|$)/g)).toHaveLength(2);
    });
});

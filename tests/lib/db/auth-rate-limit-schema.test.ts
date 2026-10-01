import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/mysql-core';

import { rateLimitBuckets } from '@/lib/db/schema';

describe('auth rate-limit schema contract', () => {
    it('uses one digest primary key and an expiry cleanup index', () => {
        const config = getTableConfig(rateLimitBuckets);
        const keyHash = config.columns.find((column) => column.name === 'key_hash');
        const resetIndex = config.indexes.find(
            (candidate) => candidate.config.name === 'idx_rate_limit_buckets_reset_at'
        );

        expect(keyHash?.primary).toBe(true);
        expect(keyHash?.notNull).toBe(true);
        expect(
            resetIndex?.config.columns.every((column) => 'name' in column)
        ).toBe(true);
        expect(
            resetIndex?.config.columns.map((column) =>
                'name' in column ? column.name : null
            )
        ).toEqual(['reset_at']);
    });

    it('keeps migration 0011 additive and free of existing-row rewrites', () => {
        const migration = readFileSync(
            resolve(process.cwd(), 'drizzle/0011_auth_shared_rate_limit.sql'),
            'utf8'
        );

        expect(migration).toMatch(/CREATE TABLE `rate_limit_buckets`/);
        expect(migration).toMatch(/PRIMARY KEY\(`key_hash`\)/);
        expect(migration).toMatch(/CREATE INDEX `idx_rate_limit_buckets_reset_at`/);
        expect(migration).not.toMatch(/^\s*(DROP|DELETE|UPDATE|ALTER|RENAME)\b/im);
    });
});

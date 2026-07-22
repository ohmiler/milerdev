import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/mysql-core';

import { accounts } from '@/lib/db/schema';

describe('OAuth account schema contract', () => {
    it('enforces one row per provider identity', () => {
        const config = getTableConfig(accounts);
        const providerIdentity = config.indexes.find(
            (candidate) => candidate.config.name === 'uq_accounts_provider_identity'
        );

        expect(providerIdentity?.config.unique).toBe(true);
        expect(providerIdentity?.config.columns.map((column) => column.name)).toEqual([
            'provider',
            'providerAccountId',
        ]);
    });

    it('repairs fresh histories before adding only the unique identity index', () => {
        const migration = readFileSync(
            resolve(process.cwd(), 'drizzle/0010_oauth_account_identity.sql'),
            'utf8'
        );

        expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS `accounts`/);
        expect(migration).toMatch(
            /ADD CONSTRAINT `uq_accounts_provider_identity` UNIQUE\(`provider`,`providerAccountId`\)/
        );
        expect(migration.indexOf('CREATE TABLE IF NOT EXISTS')).toBeLessThan(
            migration.indexOf('ADD CONSTRAINT `uq_accounts_provider_identity`')
        );
        expect(migration).not.toMatch(/^\s*(DROP|DELETE|UPDATE|RENAME)\b/im);
    });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/mysql-core';

import { payments } from '@/lib/db/schema';

describe('payment intent schema contract', () => {
  it('exposes a nullable coupon identity with a lookup index', () => {
    const config = getTableConfig(payments);
    const couponId = config.columns.find((column) => column.name === 'coupon_id');
    const couponIndex = config.indexes.find(
      (candidate) => candidate.config.name === 'idx_payments_coupon_id',
    );

    expect(couponId).toBeDefined();
    expect(couponId?.notNull).toBe(false);
    expect(couponIndex).toBeDefined();
  });

  it('keeps migration 0013 additive, nullable, and free of data rewrites', () => {
    const migration = readFileSync(
      resolve(process.cwd(), 'drizzle/0013_course_lifecycle_payment_intent.sql'),
      'utf8',
    );

    expect(migration).toMatch(/ALTER TABLE `payments` ADD `coupon_id` varchar\(36\)/);
    expect(migration).toMatch(/CREATE INDEX `idx_payments_coupon_id`/);
    expect(migration).not.toMatch(/`coupon_id` varchar\(36\) NOT NULL/);
    expect(migration).not.toMatch(/^\s*(DROP|DELETE|UPDATE|RENAME)\b/im);
  });
});

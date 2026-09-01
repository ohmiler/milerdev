import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/mysql-core';

import { analyticsEvents, measurementOutbox } from '@/lib/db/schema';

function indexColumns(config: ReturnType<typeof getTableConfig>, name: string) {
  const candidate = config.indexes.find((entry) => entry.config.name === name);
  return {
    unique: candidate?.config.unique,
    columns: candidate?.config.columns.map((column) => (
      'name' in column ? column.name : null
    )),
  };
}

describe('authoritative acquisition outbox schema', () => {
  it('keys paid purchases by payment and free enrollments by enrollment', () => {
    const outbox = getTableConfig(measurementOutbox);
    const paymentId = outbox.columns.find((column) => column.name === 'payment_id');
    const enrollmentId = outbox.columns.find((column) => column.name === 'enrollment_id');

    expect(paymentId?.notNull).toBe(false);
    expect(enrollmentId?.notNull).toBe(false);
    expect(indexColumns(outbox, 'uq_measurement_outbox_event_payment')).toEqual({
      unique: true,
      columns: ['event_name', 'payment_id'],
    });
    expect(indexColumns(outbox, 'uq_measurement_outbox_event_enrollment')).toEqual({
      unique: true,
      columns: ['event_name', 'enrollment_id'],
    });
    expect(outbox.checks.map((candidate) => candidate.name)).toContain(
      'chk_measurement_outbox_identity',
    );
  });

  it('deduplicates projected facts using the same domain identities', () => {
    const analytics = getTableConfig(analyticsEvents);
    const enrollmentId = analytics.columns.find((column) => column.name === 'enrollment_id');

    expect(enrollmentId?.notNull).toBe(false);
    expect(indexColumns(analytics, 'uq_analytics_event_payment')).toEqual({
      unique: true,
      columns: ['event_name', 'payment_id'],
    });
    expect(indexColumns(analytics, 'uq_analytics_event_enrollment')).toEqual({
      unique: true,
      columns: ['event_name', 'enrollment_id'],
    });
  });
  it('keeps migration 0017 additive and identity-safe', () => {
    const migration = readFileSync(
      resolve(process.cwd(), 'drizzle/0017_authoritative_acquisition_facts.sql'),
      'utf8',
    );

    expect(migration).toMatch(/MODIFY COLUMN .payment_id. varchar\(36\);/);
    expect(migration.match(/ADD .enrollment_id. varchar\(36\)/g)).toHaveLength(2);
    expect(migration).toMatch(/ADD CONSTRAINT .chk_measurement_outbox_acquisition_identity. CHECK/);
    expect(migration).not.toMatch(/chk_analytics_acquisition_identity/);
    expect(migration).not.toMatch(/^\s*(DROP|DELETE|UPDATE|RENAME|TRUNCATE)\b/im);
  });
});

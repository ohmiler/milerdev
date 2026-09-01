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

describe('learner cohort fact schema', () => {
  it('keeps learning identities separate from acquisition identities in one outbox', () => {
    const outbox = getTableConfig(measurementOutbox);

    expect(outbox.columns.find((column) => column.name === 'learning_fact_id')?.notNull).toBe(false);
    expect(outbox.columns.find((column) => column.name === 'learning_enrollment_id')?.notNull).toBe(false);
    expect(outbox.columns.find((column) => column.name === 'course_id')?.notNull).toBe(false);
    expect(outbox.columns.find((column) => column.name === 'lesson_id')?.notNull).toBe(false);
    expect(indexColumns(outbox, 'uq_measurement_outbox_learning_fact')).toEqual({
      unique: true,
      columns: ['event_name', 'learning_fact_id'],
    });
    expect(outbox.checks.map((candidate) => candidate.name)).toContain(
      'chk_measurement_outbox_identity',
    );
  });

  it('stores privacy-minimized learner facts with event-scoped idempotency', () => {
    const analytics = getTableConfig(analyticsEvents);

    expect(analytics.columns.find((column) => column.name === 'learning_fact_id')?.notNull).toBe(false);
    expect(analytics.columns.find((column) => column.name === 'learning_enrollment_id')?.notNull).toBe(false);
    expect(analytics.columns.find((column) => column.name === 'lesson_id')?.notNull).toBe(false);
    expect(indexColumns(analytics, 'uq_analytics_learning_fact')).toEqual({
      unique: true,
      columns: ['event_name', 'learning_fact_id'],
    });
  });

  it('uses a rollback-compatible migration without destructive data operations', () => {
    const migration = readFileSync(
      resolve(process.cwd(), 'drizzle/0018_learning_milestone_facts.sql'),
      'utf8',
    );

    expect(migration).toMatch(/ADD .learning_fact_id. varchar\(36\)/);
    expect(migration).toMatch(/ADD .learning_enrollment_id. varchar\(36\)/);
    expect(migration).toMatch(/ADD CONSTRAINT .chk_measurement_outbox_identity. CHECK/);
    expect(migration).toMatch(/measurement_outbox_learning_enrollment_id_enrollments_id_fk.*ON DELETE cascade/);
    expect(migration).toMatch(/measurement_outbox_course_id_courses_id_fk.*ON DELETE cascade/);
    expect(migration).toMatch(/measurement_outbox_lesson_id_lessons_id_fk.*ON DELETE cascade/);
    expect(migration).not.toMatch(/^\s*(DROP TABLE|DROP COLUMN|DELETE|UPDATE|RENAME|TRUNCATE)\b/im);
  });
});

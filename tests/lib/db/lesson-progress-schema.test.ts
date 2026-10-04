import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/mysql-core';

import { lessonProgress } from '@/lib/db/schema';

function indexColumns(config: ReturnType<typeof getTableConfig>, name: string) {
  const candidate = config.indexes.find((entry) => entry.config.name === name);
  return {
    unique: candidate?.config.unique,
    columns: candidate?.config.columns.map((column) => (
      'name' in column ? column.name : null
    )),
  };
}

describe('lesson progress schema', () => {
  it('prevents concurrent first writes from creating duplicate lesson progress', () => {
    const progress = getTableConfig(lessonProgress);
    const migration = readFileSync(
      resolve(process.cwd(), 'drizzle/0019_amusing_captain_midlands.sql'),
      'utf8',
    );

    expect(indexColumns(progress, 'uq_lesson_progress_user_lesson')).toEqual({
      unique: true,
      columns: ['user_id', 'lesson_id'],
    });
    expect(migration).toMatch(
      /ADD CONSTRAINT .uq_lesson_progress_user_lesson. UNIQUE\(.user_id.,.lesson_id.\)/,
    );
    expect(migration).not.toMatch(/^\s*(DROP TABLE|DROP COLUMN|DELETE|UPDATE|RENAME|TRUNCATE)\b/im);
  });

});

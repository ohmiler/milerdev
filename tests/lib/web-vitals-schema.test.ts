import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/mysql-core';

import { webVitals } from '@/lib/db/schema';

function indexColumns(config: ReturnType<typeof getTableConfig>, name: string) {
  const candidate = config.indexes.find((entry) => entry.config.name === name);
  return {
    unique: candidate?.config.unique,
    columns: candidate?.config.columns.map((column) => (
      'name' in column ? column.name : null
    )),
  };
}

describe('Web Vitals schema', () => {
  it('stores only the page-load key, coarse dimensions, value, rating, and retention timestamps', () => {
    const table = getTableConfig(webVitals);

    expect(table.columns.map((column) => column.name)).toEqual([
      'id',
      'page_load_id',
      'metric_name',
      'route_family',
      'device_class',
      'release_identity',
      'value',
      'rating',
      'created_at',
      'updated_at',
    ]);
    expect(indexColumns(table, 'uq_web_vitals_page_metric')).toEqual({
      unique: true,
      columns: ['page_load_id', 'metric_name'],
    });
  });

  it('uses an additive migration with the page-load metric upsert key', () => {
    const migration = readFileSync(
      resolve(process.cwd(), 'drizzle/0020_dapper_lenny_balinger.sql'),
      'utf8',
    );

    expect(migration).toMatch(/CREATE TABLE .web_vitals./);
    expect(migration).toMatch(
      /CONSTRAINT .uq_web_vitals_page_metric. UNIQUE\(.page_load_id.,.metric_name.\)/,
    );
    expect(migration).not.toMatch(/user_id|full_url|query|ip_address|user_agent/i);
    expect(migration).not.toMatch(/^\s*(DROP TABLE|DROP COLUMN|DELETE|UPDATE|RENAME|TRUNCATE)\b/im);
  });
});

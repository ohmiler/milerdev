import { describe, expect, it } from 'vitest';

import { parseE2EFixtureTarget } from '../../scripts/e2e-fixture-target';

describe('E2E fixture target guard', () => {
  it.each([
    ['mysql://runner:placeholder@localhost:3306/milerdev_e2e', 3306],
    ['mysql://runner:placeholder@127.0.0.1:3307/milerdev_e2e', 3307],
  ])('accepts the dedicated local E2E schema at %s', (databaseUrl, port) => {
    expect(parseE2EFixtureTarget(databaseUrl)).toEqual({
      database: 'milerdev_e2e',
      hostname: databaseUrl.includes('127.0.0.1') ? '127.0.0.1' : 'localhost',
      port,
    });
  });

  it.each([
    undefined,
    'not-a-url',
    'postgres://runner:placeholder@localhost:3306/milerdev_e2e',
    'mysql://runner:placeholder@example.com:3306/milerdev_e2e',
    'mysql://runner:placeholder@localhost:3306/milerdev',
    'mysql://runner:placeholder@localhost:3306/production',
    'mysql://runner:placeholder@localhost:3308/milerdev_e2e',
  ])('rejects an unauthorized fixture target: %s', (databaseUrl) => {
    expect(() => parseE2EFixtureTarget(databaseUrl)).toThrow();
  });
});

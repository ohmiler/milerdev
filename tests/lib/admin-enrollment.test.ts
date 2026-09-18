import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MySqlDialect } from 'drizzle-orm/mysql-core';
import type { SQL } from 'drizzle-orm';

vi.mock('@/lib/db', () => ({ db: {} }));
vi.mock('next/headers', () => ({ headers: vi.fn() }));
import { auditLogs, courses, enrollments, users } from '@/lib/db/schema';
import { changeAdminEnrollmentAccess, grantAdminEnrollment } from '@/lib/admin-enrollment';

const actor = { actorId: 'admin', context: { ipAddress: null, userAgent: null } };
const completedAt = new Date('2026-08-01T00:00:00Z');
const dialect = new MySqlDialect();
type Row = Record<string, unknown>;
let rows: Row[];
let audit: Row[];
let failAudit: boolean;
let memberExists: boolean;
let courseExists: boolean;
let locks: string[];
let predicates: string[];

// Transactional test adapter: models commit/rollback, not MySQL concurrency.
function database() {
  return {
    async transaction(work: (tx: unknown) => Promise<unknown>) {
      const pending = structuredClone(rows);
      const events: Row[] = [];
      const tx = {
        select() {
          let table: unknown;
          let predicate: SQL;
          const read = () => {
            if (table === users) return memberExists ? [{ id: 'member' }] : [];
            if (table === courses) return courseExists ? [{ id: 'course-a' }] : [];
            const query = dialect.sqlToQuery(predicate);
            predicates.push(query.sql);
            return pending.filter((row) => query.sql.includes('`user_id`')
              ? row.userId === query.params[0] && row.courseId === query.params[1]
              : row.id === query.params[0]);
          };
          const chain = {
            from(value: unknown) { table = value; return chain; },
            where(value: SQL) { predicate = value; return chain; },
            limit() { return chain; },
            for(mode: string) { locks.push(mode); return Promise.resolve(read()); },
            then(resolve: (value: Row[]) => unknown) { return Promise.resolve(read()).then(resolve); },
          };
          return chain;
        },
        update(table: unknown) {
          expect(table).toBe(enrollments);
          return { set: (patch: Row) => ({ where: async (predicate: SQL) => {
            const id = dialect.sqlToQuery(predicate).params[0];
            Object.assign(pending.find((row) => row.id === id)!, patch);
          } }) };
        },
        insert(table: unknown) {
          return { values: async (value: Row) => {
            if (table === auditLogs) {
              if (failAudit) throw new Error('audit unavailable');
              events.push(value);
            } else {
              expect(table).toBe(enrollments);
              pending.push(value);
            }
          } };
        },
      };
      const result = await work(tx);
      rows = pending;
      audit.push(...events);
      return result;
    },
  } as unknown as NonNullable<Parameters<typeof changeAdminEnrollmentAccess>[1]>;
}

beforeEach(() => {
  rows = [
    { id: 'a', userId: 'member', courseId: 'course-a', progressPercent: 100, completedAt, revokedAt: null },
    { id: 'b', userId: 'member', courseId: 'course-b', progressPercent: 50, completedAt: null, revokedAt: null },
  ];
  audit = []; locks = []; predicates = []; failAudit = false; memberExists = true; courseExists = true;
});

describe('admin enrollment access', () => {
  it('revokes one course without deleting history, then restores the same completion and identity', async () => {
    const original = structuredClone(rows);
    const db = database();
    await changeAdminEnrollmentAccess({ ...actor, enrollmentId: 'a', action: 'revoke', reason: 'operator request' }, db);
    expect(rows[0]).toEqual({ ...original[0], revokedAt: expect.any(Date) });
    expect(rows[1]).toEqual(original[1]);
    expect(audit[0]).toMatchObject({ userId: 'admin', entityId: 'a' });
    expect(JSON.parse(String(audit[0].newValue))).toEqual({ access: 'revoked', reason: 'operator request' });
    await changeAdminEnrollmentAccess({ ...actor, enrollmentId: 'a', action: 'restore', reason: 'access approved' }, db);
    expect(rows).toEqual(original);
    expect(locks).toEqual(['update', 'update']);
  });

  it('rolls back revocation when its audit cannot be persisted', async () => {
    failAudit = true;
    await expect(changeAdminEnrollmentAccess({ ...actor, enrollmentId: 'a', action: 'revoke', reason: 'operator request' }, database())).rejects.toThrow('audit unavailable');
    expect(rows[0].revokedAt).toBeNull();
    expect(audit).toEqual([]);
  });

  it('does not change timestamp or duplicate audit on repeated revocation', async () => {
    rows[0].revokedAt = completedAt;
    expect(await changeAdminEnrollmentAccess({ ...actor, enrollmentId: 'a', action: 'revoke', reason: 'operator request' }, database())).toMatchObject({ kind: 'unchanged' });
    expect(rows[0].revokedAt).toEqual(completedAt);
    expect(audit).toEqual([]);
  });

  it('rejects missing targets and invalid reasons without writes', async () => {
    expect(await changeAdminEnrollmentAccess({ ...actor, enrollmentId: 'missing', action: 'revoke', reason: 'operator request' }, database())).toEqual({ kind: 'not_found' });
    await expect(changeAdminEnrollmentAccess({ ...actor, enrollmentId: 'a', action: 'revoke', reason: ' ' }, database())).rejects.toThrow();
    expect(audit).toEqual([]);
  });

  it('manual grant restores existing history while CSV import skips it', async () => {
    rows[0].revokedAt = new Date();
    const db = database();
    const input = { ...actor, userId: 'member', courseId: 'course-a' };
    expect(await grantAdminEnrollment({ ...input, importHistory: { enrolledAt: new Date(), progressPercent: 0, completedAt: null } }, db)).toEqual({ kind: 'existing', enrollmentId: 'a' });
    expect(rows[0].revokedAt).toBeInstanceOf(Date);
    expect(await grantAdminEnrollment(input, db)).toEqual({ kind: 'restored', enrollmentId: 'a' });
    expect(rows[0]).toMatchObject({ id: 'a', progressPercent: 100, completedAt, revokedAt: null });
    expect(audit).toHaveLength(1);
  });

  it('new grants validate subject and course, preserve duplicate history, and audit new enrollment', async () => {
    const input = { ...actor, userId: 'member', courseId: 'course-a' };
    memberExists = false;
    expect(await grantAdminEnrollment(input, database())).toEqual({ kind: 'user_not_found' });
    memberExists = true; courseExists = false;
    expect(await grantAdminEnrollment(input, database())).toEqual({ kind: 'course_not_found' });
    courseExists = true;
    expect(await grantAdminEnrollment(input, database())).toEqual({ kind: 'existing', enrollmentId: 'a' });
    rows = [];
    const result = await grantAdminEnrollment(input, database());
    expect(result.kind).toBe('created');
    expect(rows[0]).toMatchObject({ userId: 'member', courseId: 'course-a' });
    expect(audit).toHaveLength(1);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

// DELETE /api/admin/enrollments/[id] is the admin's "ถอนสิทธิ์". It used to delete the enrollment and
// that course's progress, which let a learner's completed payment insert the row again. It now
// keeps the row and every bit of progress and sets revoked_at instead.

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  logAudit: vi.fn(),
  existing: [] as unknown[],
  writes: [] as Array<{ kind: 'update' | 'delete'; table: string; values?: Record<string, unknown>; sql: string; params: unknown[] }>,
}));

vi.mock('@/lib/auth/helpers', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/auditLog', () => ({ logAudit: mocks.logAudit }));
vi.mock('@/lib/error-handler', () => ({ logError: vi.fn() }));
vi.mock('@/lib/db', async () => {
  const { MySqlDialect: Dialect, getTableConfig } = await import('drizzle-orm/mysql-core');
  const dialect = new Dialect();
  const compile = (condition: Parameters<typeof dialect.sqlToQuery>[0]) => dialect.sqlToQuery(condition);

  return {
    db: {
      select: () => {
        const chain: Record<string, unknown> = {};
        for (const method of ['from', 'where']) chain[method] = () => chain;
        chain.limit = async () => mocks.existing;
        return chain;
      },
      update: (table: never) => ({
        set: (values: Record<string, unknown>) => ({
          where: async (condition: Parameters<typeof dialect.sqlToQuery>[0]) => {
            const query = compile(condition);
            mocks.writes.push({ kind: 'update', table: getTableConfig(table).name, values, sql: query.sql, params: query.params });
          },
        }),
      }),
      delete: (table: never) => ({
        where: async (condition: Parameters<typeof dialect.sqlToQuery>[0]) => {
          const query = compile(condition);
          mocks.writes.push({ kind: 'delete', table: getTableConfig(table).name, sql: query.sql, params: query.params });
        },
      }),
      transaction: vi.fn(),
    },
  };
});

import { DELETE } from '@/app/api/admin/enrollments/[id]/route';

const admin = { session: { user: { id: 'admin-a', role: 'admin' } } };
const enrollment = { userId: 'user-1', courseId: 'course-1', revokedAt: null };

function revoke() {
  return DELETE(new Request('http://localhost/api/admin/enrollments/enr-1', { method: 'DELETE' }), {
    params: Promise.resolve({ id: 'enr-1' }),
  });
}

describe('DELETE /api/admin/enrollments/[id] (revocation)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.writes.length = 0;
    mocks.existing = [enrollment];
    mocks.requireAdmin.mockResolvedValue(admin);
  });

  it('sets revoked_at on that enrollment only, and only if it is still active', async () => {
    const response = await revoke();

    expect(response.status).toBe(200);
    expect(mocks.writes).toHaveLength(1);
    const [write] = mocks.writes;
    expect(write).toMatchObject({ kind: 'update', table: 'enrollments' });
    expect(write.values?.revokedAt).toBeInstanceOf(Date);
    expect(Object.keys(write.values ?? {})).toEqual(['revokedAt']);
    expect(write.sql).toBe('(`enrollments`.`id` = ? and `enrollments`.`revoked_at` is null)');
    expect(write.params).toEqual(['enr-1']);
  });

  it('keeps the enrollment row and every lesson progress row', async () => {
    await revoke();

    expect(mocks.writes.filter((entry) => entry.kind === 'delete')).toEqual([]);
    expect(mocks.writes.some((entry) => entry.table === 'lesson_progress')).toBe(false);
  });

  it('records the revocation in the audit log', async () => {
    await revoke();

    expect(mocks.logAudit).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'admin-a',
      action: 'update',
      entityType: 'enrollment',
      entityId: 'enr-1',
      newValue: 'revoked access: user: user-1, course: course-1',
    }));
  });

  it('answers 200 for an enrollment that is already revoked, without writing or auditing again', async () => {
    mocks.existing = [{ ...enrollment, revokedAt: new Date('2026-10-01T00:00:00Z') }];

    expect((await revoke()).status).toBe(200);
    expect(mocks.writes).toHaveLength(0);
    expect(mocks.logAudit).not.toHaveBeenCalled();
  });

  it('writes nothing and no audit when the enrollment does not exist', async () => {
    mocks.existing = [];

    expect((await revoke()).status).toBe(404);
    expect(mocks.writes).toHaveLength(0);
    expect(mocks.logAudit).not.toHaveBeenCalled();
  });

  it('refuses anyone who is not an admin before touching data', async () => {
    const { NextResponse } = await import('next/server');
    mocks.requireAdmin.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

    expect((await revoke()).status).toBe(401);
    expect(mocks.writes).toHaveLength(0);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  logAudit: vi.fn(),
  existing: [] as unknown[],
  deletes: [] as Array<{ table: string; sql: string; params: unknown[]; insideTransaction: boolean }>,
  inTransaction: false,
  transaction: vi.fn(),
}));

vi.mock('@/lib/auth/helpers', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/auditLog', () => ({ logAudit: mocks.logAudit }));
vi.mock('@/lib/error-handler', () => ({ logError: vi.fn() }));
vi.mock('@/lib/db', async () => {
  const { drizzle: build } = await import('drizzle-orm/mysql2');
  const { MySqlDialect: Dialect, getTableConfig } = await import('drizzle-orm/mysql-core');
  const dialect = new Dialect();

  // A real query builder (never connected) so the delete conditions can be compiled to SQL.
  const builder = build.mock();
  const recordDelete = (table: Parameters<typeof builder.delete>[0]) => ({
    where: async (condition: Parameters<typeof dialect.sqlToQuery>[0]) => {
      const query = dialect.sqlToQuery(condition);
      mocks.deletes.push({
        table: getTableConfig(table as never).name,
        sql: query.sql,
        params: query.params,
        insideTransaction: mocks.inTransaction,
      });
    },
  });
  const tx = {
    select: builder.select.bind(builder),
    delete: recordDelete,
  };

  return {
    db: {
      select: () => {
        const chain: Record<string, unknown> = {};
        for (const method of ['from', 'where']) chain[method] = () => chain;
        chain.limit = async () => mocks.existing;
        return chain;
      },
      delete: recordDelete,
      transaction: async (callback: (client: typeof tx) => Promise<unknown>) => {
        mocks.transaction();
        mocks.inTransaction = true;
        try {
          return await callback(tx);
        } finally {
          mocks.inTransaction = false;
        }
      },
    },
  };
});

import { DELETE } from '@/app/api/admin/enrollments/[id]/route';

const admin = { session: { user: { id: 'admin-a', role: 'admin' } } };
const enrollment = { id: 'enr-1', userId: 'user-1', courseId: 'course-1' };

function remove() {
  return DELETE(new Request('http://localhost/api/admin/enrollments/enr-1', { method: 'DELETE' }), {
    params: Promise.resolve({ id: 'enr-1' }),
  });
}

describe('DELETE /api/admin/enrollments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deletes.length = 0;
    mocks.existing = [enrollment];
    mocks.inTransaction = false;
    mocks.requireAdmin.mockResolvedValue(admin);
  });

  it('removes only the progress of the lessons in the enrollment course', async () => {
    const response = await remove();

    expect(response.status).toBe(200);
    const progress = mocks.deletes.find((entry) => entry.table === 'lesson_progress');
    expect(progress).toBeDefined();
    expect(progress?.sql).toContain('`lesson_progress`.`user_id` = ?');
    expect(progress?.sql).toMatch(/`lesson_progress`\.`lesson_id` in \(select `id` from `lessons` where `lessons`\.`course_id` = \?\)/);
    expect(progress?.params).toEqual(['user-1', 'course-1']);
  });

  it('never deletes progress by member alone, which would wipe every other course', async () => {
    await remove();

    for (const entry of mocks.deletes.filter((item) => item.table === 'lesson_progress')) {
      expect(entry.sql).toContain('lesson_id');
    }
  });

  it('deletes the progress and the enrollment together in one transaction', async () => {
    await remove();

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.deletes.map((entry) => entry.table)).toEqual(['lesson_progress', 'enrollments']);
    expect(mocks.deletes.every((entry) => entry.insideTransaction)).toBe(true);
  });

  it('records the removal in the audit log', async () => {
    await remove();

    expect(mocks.logAudit).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'admin-a',
      action: 'delete',
      entityType: 'enrollment',
      entityId: 'enr-1',
      oldValue: 'user: user-1, course: course-1',
    }));
  });

  it('deletes nothing and writes no audit when the enrollment does not exist', async () => {
    mocks.existing = [];

    expect((await remove()).status).toBe(404);
    expect(mocks.deletes).toHaveLength(0);
    expect(mocks.logAudit).not.toHaveBeenCalled();
  });

  it('refuses anyone who is not an admin before touching data', async () => {
    const { NextResponse } = await import('next/server');
    mocks.requireAdmin.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

    expect((await remove()).status).toBe(401);
    expect(mocks.deletes).toHaveLength(0);
  });
});

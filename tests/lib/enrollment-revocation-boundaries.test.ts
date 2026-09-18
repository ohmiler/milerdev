import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MySqlDialect } from 'drizzle-orm/mysql-core';
import type { SQL } from 'drizzle-orm';

const state = vi.hoisted(() => ({ rows: [] as unknown[][], predicates: [] as unknown[], writes: vi.fn(), existing: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: async () => ({ user: { id: 'member' } }) }));
vi.mock('@/lib/certificate', () => ({ ensureCompletedCertificate: vi.fn() }));
vi.mock('@/lib/privacy-consent', () => ({ getMemberConsentId: vi.fn() }));
vi.mock('@/lib/learning-measurement', () => ({ learningMeasurementProjector: { projectMilestone: vi.fn() } }));
vi.mock('@/lib/email', () => ({ sendEnrollmentEmail: vi.fn() }));
vi.mock('@/lib/db', () => {
  const tx = {
    select: () => {
      const rows = state.rows.shift() ?? [];
      const chain = {
        from: () => chain,
        where: (sql: unknown) => { state.predicates.push(sql); return chain; },
        limit: () => chain,
        for: () => Promise.resolve(rows),
        then: (resolve: (rows: unknown[]) => unknown) => Promise.resolve(rows).then(resolve),
      };
      return chain;
    },
    insert: state.writes, update: state.writes, delete: state.writes,
    query: { enrollments: { findFirst: state.existing } },
  };
  return { db: { ...tx, transaction: async (work: (tx: unknown) => unknown) => work(tx) } };
});
import { updateLearningProgress } from '@/lib/learning-progress';
import { GET as check } from '@/app/api/enrollments/check/route';
import { GET as enrollmentStatus } from '@/app/api/enroll/route';
import { safeInsertEnrollment } from '@/lib/db/safe-insert';

beforeEach(() => { state.rows = []; state.predicates = []; vi.clearAllMocks(); });
describe('revocation enforcement', () => {
  it.each([false, true])('blocks progress writes on revoked enrollment, preview=%s', async (isFreePreview) => {
    state.rows.push([{ id: 'lesson-a', courseId: 'course-a', isFreePreview }], [{ id: 'enrollment-a', revokedAt: new Date(), completedAt: null }]);
    expect(await updateLearningProgress({ userId: 'member', lessonId: 'lesson-a', completed: true })).toEqual({ status: 'forbidden' });
    expect(state.writes).not.toHaveBeenCalled();
  });
  it('both enrollment status readers require active rows in their actual SQL predicates', async () => {
    const dialect = new MySqlDialect();
    state.existing.mockImplementation(({ where }: { where: SQL }) => {
      state.predicates.push(where);
      return null;
    });
    const request = new Request('http://localhost/api/enrollments/check?courseId=course-a');
    expect(await (await check(request)).json()).toMatchObject({ enrolled: false });
    expect(await (await enrollmentStatus(request)).json()).toMatchObject({ enrolled: false });
    expect(state.predicates).toHaveLength(2);
    for (const predicate of state.predicates) {
      const compiled = dialect.sqlToQuery(predicate as SQL);
      expect(compiled.sql).toContain('`enrollments`.`revoked_at` is null');
      expect(compiled.params).toEqual(['member', 'course-a']);
    }
  });
  it('paid recovery cannot replace a revoked duplicate enrollment', async () => {
    state.writes.mockReturnValue({ values: async () => { throw Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' }); } });
    state.existing.mockResolvedValue({ id: 'enrollment-a', revokedAt: new Date() });
    await expect(safeInsertEnrollment('member', 'course-a')).rejects.toThrow('ENROLLMENT_REVOKED');
    expect(state.writes).toHaveBeenCalledTimes(1);
  });
});

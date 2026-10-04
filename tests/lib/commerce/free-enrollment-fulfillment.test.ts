import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  dbTransaction,
  insertedRows,
  duplicateCourses,
  enrollmentIds,
} = vi.hoisted(() => ({
  dbTransaction: vi.fn(),
  insertedRows: [] as Array<Record<string, unknown>>,
  duplicateCourses: new Set<string>(),
  enrollmentIds: new Map<string, string>(),
}));

vi.mock('@/lib/db', () => ({ db: { transaction: dbTransaction } }));
vi.mock('@/lib/db/safe-insert', () => ({
  isDuplicateKeyError: vi.fn((error: unknown) => error instanceof Error && error.message === 'duplicate'),
}));

import { fulfillFreeEnrollment } from '@/lib/commerce/free-enrollment-fulfillment';

function transactionAdapter() {
  return {
    insert: vi.fn(() => ({
      values: vi.fn(async (row: Record<string, unknown>) => {
        if (duplicateCourses.has(String(row.courseId))) {
          throw new Error('duplicate');
        }
        insertedRows.push(row);
        enrollmentIds.set(String(row.courseId), String(row.id));
      }),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [{ id: 'existing-enrollment' }]),
        })),
      })),
    })),
  };
}

describe('free enrollment fulfillment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertedRows.length = 0;
    duplicateCourses.clear();
    enrollmentIds.clear();
    dbTransaction.mockImplementation(async (work) => work(transactionAdapter()));
  });

  it('creates one enrollment for a free course and writes nothing else', async () => {
    const result = await fulfillFreeEnrollment({
      userId: 'student-1',
      courseIds: ['course-1'],
    });

    expect(result.status).toBe('fulfilled');
    expect(result.created).toEqual([{ id: enrollmentIds.get('course-1'), courseId: 'course-1', created: true }]);
    expect(insertedRows).toEqual([expect.objectContaining({ userId: 'student-1', courseId: 'course-1' })]);
  });

  it('creates one enrollment per course in a free Bundle', async () => {
    const result = await fulfillFreeEnrollment({
      userId: 'student-1',
      courseIds: ['course-1', 'course-2', 'course-1'],
    });

    expect(result.created.map((entry) => entry.courseId)).toEqual(['course-1', 'course-2']);
    expect(insertedRows).toHaveLength(2);
  });

  it('reports an existing enrollment instead of creating a second one', async () => {
    duplicateCourses.add('course-1');

    const result = await fulfillFreeEnrollment({
      userId: 'student-1',
      courseIds: ['course-1'],
    });

    expect(result.status).toBe('already_fulfilled');
    expect(result.existing).toEqual([{ id: 'existing-enrollment', courseId: 'course-1', created: false }]);
    expect(insertedRows).toHaveLength(0);
  });

  it('rejects an empty or malformed request before opening a transaction', async () => {
    await expect(fulfillFreeEnrollment({ userId: 'student-1', courseIds: [] })).rejects.toThrow('INVALID_FREE_ENROLLMENT');
    await expect(fulfillFreeEnrollment({ userId: ' ', courseIds: ['course-1'] })).rejects.toThrow('INVALID_FREE_ENROLLMENT');
    expect(dbTransaction).not.toHaveBeenCalled();
  });
});

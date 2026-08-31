import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  dbTransaction,
  insertedRows,
  projectEnrollment,
  duplicateCourses,
  enrollmentIds,
} = vi.hoisted(() => ({
  dbTransaction: vi.fn(),
  insertedRows: [] as Array<Record<string, unknown>>,
  projectEnrollment: vi.fn(),
  duplicateCourses: new Set<string>(),
  enrollmentIds: new Map<string, string>(),
}));

vi.mock('@/lib/db', () => ({ db: { transaction: dbTransaction } }));
vi.mock('@/lib/db/safe-insert', () => ({
  isDuplicateKeyError: vi.fn((error: unknown) => error instanceof Error && error.message === 'duplicate'),
}));
vi.mock('@/lib/enrollment-measurement-projector', () => ({
  enrollmentMeasurementProjector: { projectEnrollment },
}));

import { fulfillFreeEnrollment } from '@/lib/free-enrollment-fulfillment';

function transactionAdapter() {
  return {
    insert: vi.fn(() => ({
      values: vi.fn(async (row: Record<string, unknown>) => {
        const isEnrollment = Boolean(row.id && row.userId && row.courseId && !row.eventName && !row.couponId);
        if (isEnrollment && duplicateCourses.has(String(row.courseId))) {
          throw new Error('duplicate');
        }
        insertedRows.push(row);
        if (isEnrollment) {
          enrollmentIds.set(String(row.courseId), String(row.id));
        }
      }),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [{ id: 'existing-enrollment' }]),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) })),
    })),
  };
}

describe('free enrollment fulfillment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertedRows.length = 0;
    duplicateCourses.clear();
    enrollmentIds.clear();
    projectEnrollment.mockResolvedValue({ status: 'projected' });
    dbTransaction.mockImplementation(async (work) => work(transactionAdapter()));
  });

  it('creates one enrollment fact for a first-created free course enrollment', async () => {
    const result = await fulfillFreeEnrollment({
      userId: 'student-1',
      courseIds: ['course-1'],
    });

    expect(result.status).toBe('fulfilled');
    const enrollmentId = enrollmentIds.get('course-1');
    expect(enrollmentId).toBeTruthy();
    expect(insertedRows).toContainEqual(expect.objectContaining({
      eventName: 'free_enrollment_completed',
      enrollmentId,
      paymentId: null,
    }));
    expect(projectEnrollment).toHaveBeenCalledWith(enrollmentId);
  });

  it('creates one fact per newly-created course enrollment in a free Bundle', async () => {
    const result = await fulfillFreeEnrollment({
      userId: 'student-1',
      courseIds: ['course-1', 'course-2'],
    });

    expect(result.created).toHaveLength(2);
    expect(insertedRows.filter((row) => row.eventName === 'free_enrollment_completed')).toHaveLength(2);
    expect(projectEnrollment).toHaveBeenCalledTimes(2);
  });

  it('does not enqueue a second fact when the enrollment already exists', async () => {
    duplicateCourses.add('course-1');

    const result = await fulfillFreeEnrollment({
      userId: 'student-1',
      courseIds: ['course-1'],
    });

    expect(result.status).toBe('already_fulfilled');
    expect(insertedRows).not.toContainEqual(expect.objectContaining({
      eventName: 'free_enrollment_completed',
    }));
    expect(projectEnrollment).toHaveBeenCalledWith('existing-enrollment');
  });

  it('keeps a 100%-coupon usage, enrollment, and outbox in the same transaction', async () => {
    const result = await fulfillFreeEnrollment({
      userId: 'student-1',
      courseIds: ['course-1'],
      coupon: { id: 'coupon-1', discountAmount: '990' },
    });

    expect(result.status).toBe('fulfilled');
    expect(insertedRows).toContainEqual(expect.objectContaining({
      couponId: 'coupon-1',
      userId: 'student-1',
      courseId: 'course-1',
      discountAmount: '990',
    }));
    expect(insertedRows).toContainEqual(expect.objectContaining({
      eventName: 'free_enrollment_completed',
      enrollmentId: enrollmentIds.get('course-1'),
    }));
  });

  it('does not reverse a committed free enrollment when projection is unavailable', async () => {
    projectEnrollment.mockResolvedValue({ status: 'failed' });

    const result = await fulfillFreeEnrollment({
      userId: 'student-1',
      courseIds: ['course-1'],
    });

    expect(result.status).toBe('fulfilled');
    expect(result.created).toHaveLength(1);
    expect(insertedRows).toContainEqual(expect.objectContaining({
      eventName: 'free_enrollment_completed',
      enrollmentId: result.created[0].id,
    }));
  });
});

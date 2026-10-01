import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  logAudit: vi.fn(),
  revalidatePath: vi.fn(),
  dbLimit: vi.fn(),
  dbUpdate: vi.fn(),
  dbSet: vi.fn(),
  dbWhere: vi.fn(),
}));

vi.mock('@/lib/auth/helpers', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/auditLog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auditLog')>()),
  getAuditContext: vi.fn(),
  logAudit: mocks.logAudit,
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('@/lib/error-handler', () => ({ logError: vi.fn() }));
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: mocks.dbLimit,
    update: mocks.dbUpdate,
    delete: vi.fn(),
  },
}));

import { PUT } from '@/app/api/admin/courses/[id]/route';

const session = { user: { id: 'admin-a', role: 'admin' }, expires: '2099-01-01T00:00:00.000Z' };
const routeParams = { params: Promise.resolve({ id: 'course-a' }) };
const existingCourse = {
  id: 'course-a',
  slug: 'course-a',
  title: 'Course A',
  description: null,
  price: '100.00',
  thumbnailUrl: null,
  certificateColor: '#00abff',
  certificateHeaderImage: null,
  previewVideoUrl: null,
  promoPrice: null,
  promoStartsAt: null,
  promoEndsAt: null,
  instructorId: null as string | null,
};

function put(body: unknown) {
  return PUT(new Request('http://localhost/api/admin/courses/course-a', {
    method: 'PUT',
    body: JSON.stringify(body),
  }), routeParams);
}

describe('Admin course instructor assignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ session });
    mocks.dbWhere.mockResolvedValue(undefined);
    mocks.dbSet.mockReturnValue({ where: mocks.dbWhere });
    mocks.dbUpdate.mockReturnValue({ set: mocks.dbSet });
  });

  it('assigns an active instructor or admin, audits the change, and revalidates public pages', async () => {
    mocks.dbLimit
      .mockResolvedValueOnce([existingCourse])
      .mockResolvedValueOnce([{ role: 'admin', deactivatedAt: null }]);

    const response = await put({ instructorId: 'user-teacher' });

    expect(response.status).toBe(200);
    expect(mocks.dbSet).toHaveBeenCalledWith(expect.objectContaining({ instructorId: 'user-teacher' }));
    expect(mocks.logAudit).toHaveBeenCalledWith(expect.objectContaining({
      entityType: 'course_instructor',
      entityId: 'course-a',
      oldValue: null,
      newValue: 'user-teacher',
    }));
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/courses/course-a');
  });

  it.each([
    ['a student', { role: 'student', deactivatedAt: null }],
    ['a deactivated instructor', { role: 'instructor', deactivatedAt: new Date() }],
  ])('rejects %s without writing', async (_label, candidate) => {
    mocks.dbLimit
      .mockResolvedValueOnce([existingCourse])
      .mockResolvedValueOnce([candidate]);

    const response = await put({ instructorId: 'user-x' });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'INVALID_INSTRUCTOR' });
    expect(mocks.dbUpdate).not.toHaveBeenCalled();
    expect(mocks.logAudit).not.toHaveBeenCalled();
  });

  it('rejects an unknown user id', async () => {
    mocks.dbLimit.mockResolvedValueOnce([existingCourse]).mockResolvedValueOnce([]);

    const response = await put({ instructorId: 'missing' });

    expect(response.status).toBe(400);
    expect(mocks.dbUpdate).not.toHaveBeenCalled();
  });

  it('clears the instructor with null and logs the previous value', async () => {
    mocks.dbLimit.mockResolvedValueOnce([{ ...existingCourse, instructorId: 'user-old' }]);

    const response = await put({ instructorId: null });

    expect(response.status).toBe(200);
    expect(mocks.dbSet).toHaveBeenCalledWith(expect.objectContaining({ instructorId: null }));
    expect(mocks.logAudit).toHaveBeenCalledWith(expect.objectContaining({
      entityType: 'course_instructor',
      oldValue: 'user-old',
      newValue: null,
    }));
  });

  it('keeps the instructor, skips the lookup and the extra audit when it is unchanged or omitted', async () => {
    mocks.dbLimit.mockResolvedValue([{ ...existingCourse, instructorId: 'user-old' }]);

    expect((await put({ title: 'New title' })).status).toBe(200);
    expect(mocks.dbSet).toHaveBeenLastCalledWith(expect.objectContaining({ instructorId: 'user-old' }));

    expect((await put({ instructorId: 'user-old' })).status).toBe(200);
    expect(mocks.dbLimit).toHaveBeenCalledTimes(2);
    expect(mocks.logAudit).not.toHaveBeenCalledWith(expect.objectContaining({ entityType: 'course_instructor' }));
  });

  it('requires an admin session', async () => {
    const { NextResponse } = await import('next/server');
    mocks.requireAdmin.mockResolvedValue(NextResponse.json({ error: 'forbidden' }, { status: 403 }));

    const response = await put({ instructorId: 'user-x' });

    expect(response.status).toBe(403);
    expect(mocks.dbUpdate).not.toHaveBeenCalled();
  });
});

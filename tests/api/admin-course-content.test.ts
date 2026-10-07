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
  instructorId: null,
  summary: 'Old summary',
  learningOutcomes: ['Old outcome'],
  targetAudience: null,
  prerequisites: null,
  prerequisiteCourseId: null as string | null,
};

function put(body: unknown) {
  return PUT(new Request('http://localhost/api/admin/courses/course-a', {
    method: 'PUT',
    body: JSON.stringify(body),
  }), routeParams);
}

describe('Admin course page content', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ session });
    mocks.dbWhere.mockResolvedValue(undefined);
    mocks.dbSet.mockReturnValue({ where: mocks.dbWhere });
    mocks.dbUpdate.mockReturnValue({ set: mocks.dbSet });
  });

  it('stores trimmed lists without blank items, and blanks as null', async () => {
    mocks.dbLimit.mockResolvedValueOnce([existingCourse]);

    const response = await put({
      summary: '  เรียน React จนสร้างเว็บแอปได้  ',
      learningOutcomes: [' ใช้ Hooks ', '', 'สร้างโปรเจกต์จริง'],
      targetAudience: [],
      prerequisites: ['   '],
    });

    expect(response.status).toBe(200);
    expect(mocks.dbSet).toHaveBeenCalledWith(expect.objectContaining({
      summary: 'เรียน React จนสร้างเว็บแอปได้',
      learningOutcomes: ['ใช้ Hooks', 'สร้างโปรเจกต์จริง'],
      targetAudience: null,
      prerequisites: null,
    }));
  });

  it('keeps content the request does not mention', async () => {
    mocks.dbLimit.mockResolvedValueOnce([existingCourse]);

    await put({ title: 'Course A v2' });

    expect(mocks.dbSet).toHaveBeenCalledWith(expect.objectContaining({
      summary: 'Old summary',
      learningOutcomes: ['Old outcome'],
      prerequisiteCourseId: null,
    }));
  });

  it('links a course to take first when it is another course still on sale', async () => {
    mocks.dbLimit
      .mockResolvedValueOnce([existingCourse])
      .mockResolvedValueOnce([{ status: 'published' }]);

    const response = await put({ prerequisiteCourseId: 'course-js' });

    expect(response.status).toBe(200);
    expect(mocks.dbSet).toHaveBeenCalledWith(expect.objectContaining({ prerequisiteCourseId: 'course-js' }));
  });

  it.each([
    ['the course itself', 'course-a', []],
    ['a missing course', 'course-gone', [[]]],
    ['an archived course', 'course-old', [[{ status: 'archived' }]]],
  ])('rejects %s as the course to take first, without writing', async (_label, prerequisiteCourseId, lookups) => {
    mocks.dbLimit.mockResolvedValueOnce([existingCourse]);
    for (const rows of lookups) mocks.dbLimit.mockResolvedValueOnce(rows);

    const response = await put({ prerequisiteCourseId });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'INVALID_PREREQUISITE' });
    expect(mocks.dbUpdate).not.toHaveBeenCalled();
  });

  it('rejects a summary over 300 characters and more than 8 items in a list', async () => {
    expect((await put({ summary: 'ก'.repeat(301) })).status).toBe(400);
    expect((await put({ learningOutcomes: Array.from({ length: 9 }, (_, index) => `ข้อ ${index}`) })).status).toBe(400);
    expect(mocks.dbUpdate).not.toHaveBeenCalled();
  });
});

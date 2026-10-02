import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  requireAdmin: vi.fn(),
  logAudit: vi.fn(),
  revalidatePath: vi.fn(),
  selectResults: [] as unknown[][],
}));

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/auth/helpers', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/auditLog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auditLog')>()),
  getAuditContext: vi.fn(),
  logAudit: mocks.logAudit,
}));
vi.mock('@/lib/error-handler', () => ({ logError: vi.fn() }));
vi.mock('@/lib/security/sanitize', () => ({ sanitizeRichContent: (value: string) => value }));
vi.mock('@/lib/db', () => {
  // Each select() resolves to the next queued result, with or without a trailing limit().
  const select = () => {
    const chain: Record<string, unknown> = {};
    for (const method of ['from', 'where', 'orderBy', 'limit']) chain[method] = () => chain;
    chain.then = (resolve: (rows: unknown[]) => unknown) => resolve(mocks.selectResults.shift() ?? []);
    return chain;
  };
  const write = () => ({
    values: async () => undefined,
    set: () => ({ where: async () => undefined }),
    where: async () => undefined,
  });
  return { db: { select, insert: write, update: write, delete: write } };
});

import { POST as createLesson } from '@/app/api/admin/courses/[id]/lessons/route';
import { POST as reorderLessons } from '@/app/api/admin/courses/[id]/lessons/reorder/route';
import { PUT as updateCourse } from '@/app/api/admin/courses/[id]/route';
import { DELETE as deleteLesson, PUT as updateLesson } from '@/app/api/admin/lessons/[lessonId]/route';

const session = { user: { id: 'admin-a', role: 'admin' }, expires: '2099-01-01T00:00:00.000Z' };
const existingCourse = {
  id: 'course-a',
  slug: 'old-slug',
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
};

function json(method: string, body: unknown) {
  return new Request('http://localhost/api/admin', { method, body: JSON.stringify(body) });
}

function revalidated(): string[] {
  return mocks.revalidatePath.mock.calls.map(([path]) => path as string);
}

describe('admin course edits purge cached public pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.selectResults.length = 0;
    mocks.auth.mockResolvedValue(session);
    mocks.requireAdmin.mockResolvedValue({ session });
  });

  it('revalidates the course page when only the promo price changes', async () => {
    mocks.selectResults.push([existingCourse]);

    const response = await updateCourse(
      json('PUT', { promoPrice: 49 }),
      { params: Promise.resolve({ id: 'course-a' }) },
    );

    expect(response.status).toBe(200);
    expect(revalidated()).toEqual(expect.arrayContaining(['/courses', '/courses/old-slug']));
  });

  it('revalidates both the old and the new slug after a rename', async () => {
    mocks.selectResults.push([existingCourse], []);

    const response = await updateCourse(
      json('PUT', { slug: 'new-slug' }),
      { params: Promise.resolve({ id: 'course-a' }) },
    );

    expect(response.status).toBe(200);
    expect(revalidated()).toEqual(expect.arrayContaining(['/courses/old-slug', '/courses/new-slug']));
  });

  it('does not revalidate when the course is not found', async () => {
    mocks.selectResults.push([]);

    const response = await updateCourse(
      json('PUT', { promoPrice: 49 }),
      { params: Promise.resolve({ id: 'missing' }) },
    );

    expect(response.status).toBe(404);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('revalidates the course page after adding a lesson', async () => {
    mocks.selectResults.push([], [{ slug: 'old-slug' }]);

    const response = await createLesson(
      json('POST', { title: 'Lesson 1' }),
      { params: Promise.resolve({ id: 'course-a' }) },
    );

    expect(response.status).toBe(201);
    expect(revalidated()).toEqual(expect.arrayContaining(['/courses', '/courses/old-slug']));
  });

  it('revalidates the course page after reordering lessons', async () => {
    mocks.selectResults.push([{ slug: 'old-slug' }]);

    const response = await reorderLessons(
      json('POST', { lessonIds: ['l1', 'l2'] }),
      { params: Promise.resolve({ id: 'course-a' }) },
    );

    expect(response.status).toBe(200);
    expect(revalidated()).toContain('/courses/old-slug');
  });

  it('revalidates the owning course after editing or deleting a lesson', async () => {
    const lesson = {
      id: 'l1',
      courseId: 'course-a',
      title: 'L',
      content: null,
      videoUrl: null,
      videoDuration: 0,
      orderIndex: 0,
      isFreePreview: false,
    };
    const params = { params: Promise.resolve({ lessonId: 'l1' }) };

    mocks.selectResults.push([lesson], [{ slug: 'old-slug' }]);
    expect((await updateLesson(json('PUT', { title: 'New' }), params)).status).toBe(200);
    expect(revalidated()).toContain('/courses/old-slug');

    mocks.revalidatePath.mockClear();
    mocks.selectResults.push([lesson], [{ slug: 'old-slug' }]);
    expect((await deleteLesson(json('DELETE', {}), params)).status).toBe(200);
    expect(revalidated()).toContain('/courses/old-slug');
  });
});

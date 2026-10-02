import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  requireAdmin: vi.fn(),
  logAudit: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateBundleWithIntegrity: vi.fn(),
  selectResults: [] as unknown[][],
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
  revalidateTag: mocks.revalidateTag,
}));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/auth/helpers', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/auditLog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auditLog')>()),
  getAuditContext: vi.fn(),
  logAudit: mocks.logAudit,
}));
vi.mock('@/lib/error-handler', () => ({ logError: vi.fn() }));
vi.mock('@/lib/security/sanitize', () => ({ sanitizeRichContent: (value: string) => value }));
vi.mock('@/lib/commerce/bundle-mutation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/commerce/bundle-mutation')>()),
  updateBundleWithIntegrity: mocks.updateBundleWithIntegrity,
}));
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

import { POST as createBlogPost } from '@/app/api/admin/blog/route';
import { DELETE as deleteBlogPost, PATCH as toggleBlogPost, PUT as updateBlogPost } from '@/app/api/admin/blog/[id]/route';
import { PUT as updateBundle } from '@/app/api/admin/bundles/[id]/route';
import { POST as importReviews } from '@/app/api/admin/reviews/route';
import { DELETE as deleteReview, PUT as updateReview } from '@/app/api/admin/reviews/[id]/route';
import { POST as createTag } from '@/app/api/admin/tags/route';
import { DELETE as deleteTag, PUT as updateTag } from '@/app/api/admin/tags/[id]/route';

const session = { user: { id: 'admin-a', role: 'admin' }, expires: '2099-01-01T00:00:00.000Z' };

function json(method: string, body: unknown) {
  return new Request('http://localhost/api/admin', { method, body: JSON.stringify(body) });
}

function revalidated(): string[] {
  return mocks.revalidatePath.mock.calls.map(([path]) => path as string);
}

describe('admin content edits purge cached public pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.selectResults.length = 0;
    mocks.auth.mockResolvedValue(session);
    mocks.requireAdmin.mockResolvedValue({ session });
  });

  describe('blog', () => {
    const post = { id: 'p1', title: 'Post', slug: 'post', status: 'draft', publishedAt: null, excerpt: null, content: null, thumbnailUrl: null };
    const params = { params: Promise.resolve({ id: 'p1' }) };

    function expectBlogPurged() {
      expect(mocks.revalidateTag).toHaveBeenCalledWith('blog-posts', { expire: 0 });
      expect(revalidated()).toEqual(expect.arrayContaining(['/blog', '/blog/[slug]']));
    }

    it('purges after creating a post', async () => {
      mocks.selectResults.push([]);
      expect((await createBlogPost(json('POST', { title: 'Hello', status: 'published' }))).status).toBe(201);
      expectBlogPurged();
    });

    it('purges after editing a post', async () => {
      mocks.selectResults.push([post]);
      expect((await updateBlogPost(json('PUT', { title: 'New title' }), params)).status).toBe(200);
      expectBlogPurged();
    });

    it('purges after publishing or unpublishing a post', async () => {
      mocks.selectResults.push([post]);
      expect((await toggleBlogPost(json('PATCH', { status: 'published' }), params)).status).toBe(200);
      expectBlogPurged();
    });

    it('purges after deleting a post', async () => {
      mocks.selectResults.push([post]);
      expect((await deleteBlogPost(json('DELETE', {}), params)).status).toBe(200);
      expectBlogPurged();
    });

    it('does not purge when the post is not found', async () => {
      mocks.selectResults.push([]);
      expect((await toggleBlogPost(json('PATCH', { status: 'published' }), params)).status).toBe(404);
      expect(mocks.revalidateTag).not.toHaveBeenCalled();
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('tags', () => {
    const params = { params: Promise.resolve({ id: 't1' }) };

    function expectTagPagesPurged() {
      expect(revalidated()).toEqual(expect.arrayContaining(['/courses', '/courses/[slug]', '/blog', '/blog/[slug]']));
      expect(mocks.revalidateTag).toHaveBeenCalledWith('blog-posts', { expire: 0 });
    }

    it('purges after creating, renaming and deleting a tag', async () => {
      mocks.selectResults.push([]);
      expect((await createTag(json('POST', { name: 'React' }))).status).toBe(200);
      expectTagPagesPurged();

      vi.clearAllMocks();
      mocks.selectResults.push([{ id: 't1', name: 'React' }]);
      expect((await updateTag(json('PUT', { name: 'React 19' }), params)).status).toBe(200);
      expectTagPagesPurged();

      vi.clearAllMocks();
      mocks.selectResults.push([{ id: 't1', name: 'React' }]);
      expect((await deleteTag(json('DELETE', {}), params)).status).toBe(200);
      expectTagPagesPurged();
    });
  });

  describe('reviews', () => {
    const review = { id: 'r1', courseId: 'course-a' };
    const params = { params: Promise.resolve({ id: 'r1' }) };

    it('purges the course pages after hiding or deleting a review', async () => {
      mocks.selectResults.push([review], [{ slug: 'course-a-slug' }]);
      expect((await updateReview(json('PUT', { isHidden: true }), params)).status).toBe(200);
      expect(revalidated()).toContain('/courses/course-a-slug');

      vi.clearAllMocks();
      mocks.selectResults.push([review], [{ slug: 'course-a-slug' }]);
      expect((await deleteReview(json('DELETE', {}), params)).status).toBe(200);
      expect(revalidated()).toContain('/courses/course-a-slug');
    });

    it('purges each course once after importing reviews', async () => {
      mocks.selectResults.push([{ slug: 'course-a-slug' }]);

      const response = await importReviews(json('POST', {
        reviews: [
          { courseId: 'course-a', rating: 5 },
          { courseId: 'course-a', rating: 4 },
        ],
      }));

      expect(response.status).toBe(200);
      expect(revalidated().filter((path) => path === '/courses/course-a-slug')).toHaveLength(1);
    });

    it('does not purge when the review is not found', async () => {
      mocks.selectResults.push([]);
      expect((await updateReview(json('PUT', { isHidden: true }), params)).status).toBe(404);
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('bundles', () => {
    it('purges the course catalog after updating a bundle', async () => {
      mocks.selectResults.push([{ id: 'b1', slug: 'bundle' }]);
      mocks.updateBundleWithIntegrity.mockResolvedValue(undefined);

      const response = await updateBundle(
        json('PUT', { title: 'Bundle', price: '100', status: 'published', courseIds: ['course-a', 'course-b'] }),
        { params: Promise.resolve({ id: 'b1' }) },
      );

      expect(response.status).toBe(200);
      expect(revalidated()).toContain('/courses');
    });
  });
});

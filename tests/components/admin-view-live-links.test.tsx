// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BundlesPage from '@/app/admin/bundles/page';
import LessonsPage from '@/app/admin/courses/[id]/lessons/page';
import ReviewsPage from '@/app/admin/reviews/page';
import TagsPage from '@/app/admin/tags/page';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'course-1' }),
  usePathname: () => '/admin',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function mockApi(routes: Record<string, () => Response>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input).split('?')[0];
    const handler = routes[path];
    return handler ? handler() : json({});
  });
}

function hrefs() {
  return screen.queryAllByRole('link').map((link) => link.getAttribute('href'));
}

describe('admin links to the live site', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('bundles', () => {
    const bundle = (overrides: Record<string, unknown>) => ({
      id: 'b1',
      title: 'Bundle',
      slug: 'bundle-one',
      description: null,
      thumbnailUrl: null,
      price: '1000',
      status: 'published',
      courses: [],
      courseCount: 0,
      totalOriginalPrice: 1000,
      discount: 0,
      createdAt: null,
      ...overrides,
    });

    it('links a published bundle to its sales page', async () => {
      mockApi({ '/api/admin/bundles': () => json({ bundles: [bundle({})] }) });

      render(<BundlesPage />);

      await screen.findByText('Bundle');
      expect(hrefs()).toContain('/bundles/bundle-one');
    });

    it('does not link a draft bundle, whose public page answers 404', async () => {
      mockApi({ '/api/admin/bundles': () => json({ bundles: [bundle({ status: 'draft' })] }) });

      render(<BundlesPage />);

      await screen.findByText('Bundle');
      expect(hrefs()).not.toContain('/bundles/bundle-one');
    });
  });

  describe('course lessons', () => {
    const lessons = () => json({ lessons: [] });

    it('links to the public course page when the course is published', async () => {
      mockApi({
        '/api/admin/courses/course-1/lessons': lessons,
        '/api/admin/courses/course-1': () => json({ course: { slug: 'ts-course', status: 'published' } }),
      });

      render(<LessonsPage />);

      await waitFor(() => expect(hrefs()).toContain('/courses/ts-course'));
    });

    it('shows no link for an unpublished course', async () => {
      mockApi({
        '/api/admin/courses/course-1/lessons': lessons,
        '/api/admin/courses/course-1': () => json({ course: { slug: 'ts-course', status: 'draft' } }),
      });

      render(<LessonsPage />);

      await screen.findByText('จัดการบทเรียน');
      await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));
      expect(hrefs()).not.toContain('/courses/ts-course');
    });

    it('still shows the lessons when the course lookup fails', async () => {
      mockApi({
        '/api/admin/courses/course-1/lessons': lessons,
        '/api/admin/courses/course-1': () => json({ error: 'x' }, 500),
      });

      render(<LessonsPage />);

      expect(await screen.findByText('จัดการบทเรียน')).toBeTruthy();
      expect(hrefs()).not.toContain('/courses/ts-course');
    });
  });

  describe('reviews', () => {
    const review = (overrides: Record<string, unknown>) => ({
      id: 'r1',
      rating: 5,
      comment: 'ดีมาก',
      displayName: 'ผู้เรียน',
      isVerified: true,
      isHidden: false,
      createdAt: '2026-09-01T00:00:00.000Z',
      userId: 'u1',
      courseId: 'course-1',
      userName: 'ผู้เรียน',
      userEmail: 'a@example.com',
      courseTitle: 'คอร์ส TypeScript',
      courseSlug: 'ts-course',
      courseStatus: 'published',
      ...overrides,
    });
    const payload = (row: unknown) => ({
      reviews: [row],
      courses: [],
      stats: { total: 1, avgRating: 5, hidden: 0, verified: 1 },
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    it('links a review to the public page of a published course', async () => {
      mockApi({ '/api/admin/reviews': () => json(payload(review({}))) });

      render(<ReviewsPage />);

      await screen.findByText('คอร์ส TypeScript');
      expect(hrefs()).toContain('/courses/ts-course');
    });

    it('does not link a review whose course is not published', async () => {
      mockApi({ '/api/admin/reviews': () => json(payload(review({ courseStatus: 'draft' }))) });

      render(<ReviewsPage />);

      await screen.findByText('คอร์ส TypeScript');
      expect(hrefs()).not.toContain('/courses/ts-course');
    });
  });

  describe('tags', () => {
    it('links each tag to the course catalog filtered by it, with the slug encoded', async () => {
      mockApi({
        '/api/admin/tags': () => json({
          tags: [{ id: 't1', name: 'ภาษาไทย & C#', slug: 'ภาษาไทย-c#', courseCount: 2, createdAt: '2026-09-01T00:00:00.000Z' }],
        }),
      });

      render(<TagsPage />);

      await screen.findByText('ภาษาไทย & C#');
      expect(hrefs()).toContain(`/courses?tag=${encodeURIComponent('ภาษาไทย-c#')}`);
    });
  });
});

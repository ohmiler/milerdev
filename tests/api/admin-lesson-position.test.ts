import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  selectResults: [] as unknown[][],
}));

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/error-handler', () => ({ logError: vi.fn() }));
vi.mock('@/lib/db', () => {
  // Each select() resolves to the next queued result, in the order the queries are awaited.
  const select = () => {
    const chain: Record<string, unknown> = {};
    for (const method of ['from', 'where', 'orderBy', 'limit']) chain[method] = () => chain;
    chain.then = (resolve: (rows: unknown[]) => unknown) => resolve(mocks.selectResults.shift() ?? []);
    return chain;
  };
  return { db: { select } };
});

import { GET } from '@/app/api/admin/lessons/[lessonId]/route';
import { formatLessonPosition } from '@/lib/courses/lesson-position';

const lesson = { id: 'l3', courseId: 'course-a', sectionId: 'section-b', title: 'Third', orderIndex: 300 };
const get = () => GET(new Request('http://localhost/api/admin/lessons/l3'), { params: Promise.resolve({ lessonId: 'l3' }) });

describe('GET /api/admin/lessons/[lessonId] position', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.selectResults.length = 0;
    mocks.auth.mockResolvedValue({ user: { id: 'admin-a', role: 'admin' } });
  });

  it('reports the place in the course, not the gapped order_index', async () => {
    mocks.selectResults.push([lesson], [{ id: 'l1' }, { id: 'l2' }, { id: 'l3' }, { id: 'l4' }], [{ title: 'ลงมือทำ' }]);

    const body = await (await get()).json();

    expect(body).toMatchObject({ lesson: { id: 'l3', orderIndex: 300 }, position: 3, lessonCount: 4, sectionTitle: 'ลงมือทำ' });
  });

  it('reports no section for an unsectioned lesson', async () => {
    mocks.selectResults.push([{ ...lesson, sectionId: null }], [{ id: 'l3' }]);

    expect(await (await get()).json()).toMatchObject({ position: 1, lessonCount: 1, sectionTitle: null });
  });
});

describe('formatLessonPosition', () => {
  it('shows position over total, padded to the same width', () => {
    expect(formatLessonPosition(3, 12)).toBe('03 / 12');
    expect(formatLessonPosition(7, 120)).toBe('007 / 120');
    expect(formatLessonPosition(null, 12)).toBe('--');
  });
});

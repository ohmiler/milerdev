import { beforeEach, describe, expect, it, vi } from 'vitest';

const { auth, getContinueLearning, logError } = vi.hoisted(() => ({
  auth: vi.fn(),
  getContinueLearning: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth }));
vi.mock('@/lib/learning/dashboard', () => ({ getContinueLearning }));
vi.mock('@/lib/error-handler', () => ({ logError }));

import { GET } from '@/app/api/learning/continue/route';

const learning = {
  course: { title: 'HTML & CSS', slug: 'html-css', thumbnailUrl: null },
  lesson: { title: 'Flexbox', position: 4 },
  progress: { completedLessons: 3, totalLessons: 12, percent: 25 },
  continuation: 'resume',
  href: '/courses/html-css/learn',
};

describe('GET /api/learning/continue', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuses a visitor without reading anything', async () => {
    auth.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(getContinueLearning).not.toHaveBeenCalled();
  });

  it('answers a member with their own next lesson, never cached', async () => {
    auth.mockResolvedValue({ user: { id: 'member-1' } });
    getContinueLearning.mockResolvedValue(learning);

    const response = await GET();

    expect(getContinueLearning).toHaveBeenCalledWith('member-1');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.json()).toEqual({ learning });
  });

  it('logs a failed read and answers without a card', async () => {
    auth.mockResolvedValue({ user: { id: 'member-1' } });
    getContinueLearning.mockRejectedValue(new Error('database down'));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ learning: null });
    expect(logError).toHaveBeenCalledWith(expect.any(Error), { action: 'learning.continue.load_failed' });
  });
});

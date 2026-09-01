import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: {} }));
vi.mock('@/lib/error-handler', () => ({ logError: vi.fn() }));
vi.mock('@/lib/learning-progress', () => ({ updateLearningProgress: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockReturnValue({
    success: true,
    remaining: 99,
    resetTime: Date.now() + 60_000,
  }),
  rateLimits: { general: { maxRequests: 100, windowMs: 60_000 } },
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@/lib/auth';
import { updateLearningProgress } from '@/lib/learning-progress';

async function post(body: unknown) {
  const { POST } = await import('@/app/api/progress/route');
  return POST(new Request('http://localhost/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

describe('POST /api/progress contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as never);
    vi.mocked(updateLearningProgress).mockResolvedValue({
      status: 'saved',
      milestones: [],
      courseCompleted: false,
      courseId: 'course-1',
      enrollmentId: 'enrollment-1',
    });
  });

  it('passes only validated progress and the server-derived user identity', async () => {
    const response = await post({
      lessonId: 'lesson-1',
      watchTimeSeconds: 12,
      completed: true,
    });

    expect(response.status).toBe(200);
    expect(updateLearningProgress).toHaveBeenCalledWith({
      userId: 'user-1',
      lessonId: 'lesson-1',
      watchTimeSeconds: 12,
      completed: true,
    });
  });

  it.each([
    {},
    { lessonId: '' },
    { lessonId: 'lesson-1' },
    { lessonId: 'lesson-1', watchTimeSeconds: -1 },
    { lessonId: 'lesson-1', watchTimeSeconds: 1.5 },
    { lessonId: 'lesson-1', completed: 'yes' },
    { lessonId: 'lesson-1', completed: true, videoUrl: 'private' },
  ])('rejects invalid or unrestricted progress bodies', async (body) => {
    const response = await post(body);

    expect(response.status).toBe(400);
    expect(updateLearningProgress).not.toHaveBeenCalled();
  });

  it('keeps not-found and enrollment authorization outcomes distinct', async () => {
    vi.mocked(updateLearningProgress).mockResolvedValueOnce({ status: 'not_found' });
    expect((await post({ lessonId: 'lesson-1', completed: true })).status).toBe(404);

    vi.mocked(updateLearningProgress).mockResolvedValueOnce({ status: 'forbidden' });
    expect((await post({ lessonId: 'lesson-1', completed: true })).status).toBe(403);
  });
});

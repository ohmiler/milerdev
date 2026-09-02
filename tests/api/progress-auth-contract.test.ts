import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: {} }));
vi.mock('@/lib/error-handler', () => ({ logError: vi.fn() }));
vi.mock('@/lib/learning-progress', () => ({ updateLearningProgress: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  rateLimits: { general: { maxRequests: 100, windowMs: 60_000 } },
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@/lib/auth';
import { updateLearningProgress } from '@/lib/learning-progress';
import { checkRateLimit } from '@/lib/rate-limit';

describe('POST /api/progress authentication boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(null as never);
  });

  it('does not rate-limit or write progress for an anonymous preview', async () => {
    const { POST } = await import('@/app/api/progress/route');
    const response = await POST(new Request('http://localhost/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId: 'lesson-free', watchTimeSeconds: 12 }),
    }));

    expect(response.status).toBe(401);
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(updateLearningProgress).not.toHaveBeenCalled();
  });
});

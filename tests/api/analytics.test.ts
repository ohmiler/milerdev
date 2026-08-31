import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/analytics', () => ({
  isAnalyticsEventEnabled: vi.fn(),
  isPublishedAnalyticsTarget: vi.fn(),
  recordClientAnalyticsEvent: vi.fn(),
}));
vi.mock('@/lib/error-handler', () => ({ logEvent: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
  rateLimits: { general: { maxRequests: 100, windowMs: 60_000 } },
  rateLimitResponse: vi.fn().mockReturnValue(new Response(null, { status: 429 })),
}));

import {
  isAnalyticsEventEnabled,
  isPublishedAnalyticsTarget,
  recordClientAnalyticsEvent,
} from '@/lib/analytics';
import { auth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

const validEvent = {
  eventName: 'course_viewed',
  courseId: 'course-1',
  placement: 'course_detail',
};

function request(body: unknown): Request {
  return new Request('http://localhost/api/analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function post(body: unknown) {
  const route = await import('@/app/api/analytics/events/route');
  return route.POST(request(body));
}

describe('POST /api/analytics/events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockReturnValue({
      success: true,
      remaining: 99,
      resetTime: Date.now() + 60_000,
    });
    vi.mocked(isAnalyticsEventEnabled).mockResolvedValue(true);
    vi.mocked(isPublishedAnalyticsTarget).mockResolvedValue(true);
    vi.mocked(recordClientAnalyticsEvent).mockResolvedValue(true);
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as never);
  });

  it('returns 204 without target lookup or identity work when the event is disabled', async () => {
    vi.mocked(isAnalyticsEventEnabled).mockResolvedValue(false);

    const response = await post(validEvent);

    expect(response.status).toBe(204);
    expect(isAnalyticsEventEnabled).toHaveBeenCalledWith('course_viewed');
    expect(isPublishedAnalyticsTarget).not.toHaveBeenCalled();
    expect(auth).not.toHaveBeenCalled();
    expect(recordClientAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('rejects unknown events and arbitrary personal metadata', async () => {
    const response = await post({
      ...validEvent,
      eventName: 'purchase_completed',
      email: 'person@example.com',
    });

    expect(response.status).toBe(400);
    expect(recordClientAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('records only the validated event and server-derived user id', async () => {
    const response = await post(validEvent);

    expect(response.status).toBe(204);
    expect(recordClientAnalyticsEvent).toHaveBeenCalledWith(validEvent, 'user-1');
  });

  it('rejects unpublished or missing product targets', async () => {
    vi.mocked(isPublishedAnalyticsTarget).mockResolvedValue(false);

    const response = await post(validEvent);

    expect(response.status).toBe(404);
    expect(recordClientAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('applies the public endpoint rate limit before parsing or database work', async () => {
    vi.mocked(checkRateLimit).mockReturnValue({
      success: false,
      remaining: 0,
      resetTime: Date.now() + 60_000,
    });

    const response = await post(validEvent);

    expect(response.status).toBe(429);
    expect(isAnalyticsEventEnabled).not.toHaveBeenCalled();
  });
});

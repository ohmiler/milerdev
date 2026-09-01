import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/analytics', () => ({
  isAnalyticsEventEnabled: vi.fn().mockResolvedValue(true),
  isPublishedAnalyticsTarget: vi.fn().mockResolvedValue(true),
  recordClientAnalyticsEvent: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/lib/measurement-recorder', () => ({
  measurementRecorder: { recordProductExposure: vi.fn() },
}));
vi.mock('@/lib/learning-measurement', () => ({
  learningMeasurementRecorder: { recordWorkspaceStart: vi.fn() },
}));
vi.mock('@/lib/error-handler', () => ({ logEvent: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockReturnValue({
    success: true,
    remaining: 99,
    resetTime: Date.now() + 60_000,
  }),
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
  rateLimits: { general: { maxRequests: 100, windowMs: 60_000 } },
  rateLimitResponse: vi.fn(),
}));

import { isAnalyticsEventEnabled, recordClientAnalyticsEvent } from '@/lib/analytics';
import { auth } from '@/lib/auth';
import { learningMeasurementRecorder } from '@/lib/learning-measurement';
import { measurementRecorder } from '@/lib/measurement-recorder';

const exposure = {
  eventName: 'course_viewed',
  exposureId: '11111111-1111-4111-8111-111111111111',
  courseId: 'course-1',
  placement: 'course_detail',
};

const workspaceExposure = {
  eventName: 'learning_workspace_started',
  exposureId: '22222222-2222-4222-8222-222222222222',
  lessonId: 'lesson-1',
  placement: 'learning_workspace',
};

async function post(body: unknown) {
  const { POST } = await import('@/app/api/analytics/events/route');
  return POST(new Request('http://localhost/api/analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

describe('eligible product exposure API contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(measurementRecorder.recordProductExposure).mockResolvedValue({ status: 'recorded' });
    vi.mocked(learningMeasurementRecorder.recordWorkspaceStart).mockResolvedValue({ status: 'recorded' });
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as never);
    vi.mocked(isAnalyticsEventEnabled).mockResolvedValue(true);
  });

  it('derives the learner identity from the session before recording a workspace exposure', async () => {
    const response = await post(workspaceExposure);

    expect(response.status).toBe(204);
    expect(learningMeasurementRecorder.recordWorkspaceStart).toHaveBeenCalledWith({
      exposureId: workspaceExposure.exposureId,
      userId: 'user-1',
      lessonId: 'lesson-1',
    });
    expect(recordClientAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('rejects workspace exposure delivery without an authenticated learner', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const response = await post(workspaceExposure);

    expect(response.status).toBe(401);
    expect(learningMeasurementRecorder.recordWorkspaceStart).not.toHaveBeenCalled();
  });

  it('stops before learner identity or target work when learning analytics is disabled', async () => {
    vi.mocked(isAnalyticsEventEnabled).mockResolvedValue(false);

    const response = await post(workspaceExposure);

    expect(response.status).toBe(204);
    expect(auth).not.toHaveBeenCalled();
    expect(learningMeasurementRecorder.recordWorkspaceStart).not.toHaveBeenCalled();
  });

  it('does not count a lesson outside the authenticated learner enrollment', async () => {
    vi.mocked(learningMeasurementRecorder.recordWorkspaceStart).mockResolvedValue({ status: 'ineligible' });

    const response = await post(workspaceExposure);

    expect(response.status).toBe(404);
  });

  it('records a Course exposure without optional user identity lookup or the legacy writer', async () => {
    const response = await post(exposure);

    expect(response.status).toBe(204);
    expect(measurementRecorder.recordProductExposure).toHaveBeenCalledWith({
      exposureId: exposure.exposureId,
      productType: 'course',
      productId: 'course-1',
    });
    expect(auth).not.toHaveBeenCalled();
    expect(recordClientAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('does not count an ineligible, missing, or invalid product target', async () => {
    vi.mocked(measurementRecorder.recordProductExposure).mockResolvedValue({ status: 'ineligible' });

    const response = await post(exposure);

    expect(response.status).toBe(404);
    expect(auth).not.toHaveBeenCalled();
    expect(recordClientAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('accepts delivery without identity or target work when analytics is disabled', async () => {
    vi.mocked(measurementRecorder.recordProductExposure).mockResolvedValue({ status: 'disabled' });

    const response = await post(exposure);

    expect(response.status).toBe(204);
    expect(auth).not.toHaveBeenCalled();
    expect(recordClientAnalyticsEvent).not.toHaveBeenCalled();
  });
});

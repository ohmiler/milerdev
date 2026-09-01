import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/analytics-control', () => ({ isAnalyticsEventEnabled: vi.fn() }));
vi.mock('@/lib/web-vitals', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/web-vitals')>();
  return {
    ...actual,
    webVitalsRecorder: { record: vi.fn() },
  };
});
vi.mock('@/lib/error-handler', () => ({ logEvent: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
  rateLimits: { general: { maxRequests: 100, windowMs: 60_000 } },
  rateLimitResponse: vi.fn().mockReturnValue(new Response(null, { status: 429 })),
}));

import { isAnalyticsEventEnabled } from '@/lib/analytics-control';
import { checkRateLimit } from '@/lib/rate-limit';
import { webVitalsRecorder } from '@/lib/web-vitals';

const validReport = {
  pageLoadId: 'v4-1720000000000-123456789',
  metricName: 'CLS',
  routeFamily: 'home',
  deviceClass: 'desktop',
  value: 0.08,
  rating: 'good',
};

function request(body: unknown): Request {
  return new Request('http://localhost/api/analytics/web-vitals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function post(input: Request) {
  const route = await import('@/app/api/analytics/web-vitals/route');
  return route.POST(input);
}

describe('POST /api/analytics/web-vitals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockReturnValue({
      success: true,
      remaining: 99,
      resetTime: Date.now() + 60_000,
    });
    vi.mocked(isAnalyticsEventEnabled).mockResolvedValue(true);
    vi.mocked(webVitalsRecorder.record).mockResolvedValue({ status: 'recorded' });
  });

  it('returns before parsing page-load identity when performance analytics is disabled', async () => {
    vi.mocked(isAnalyticsEventEnabled).mockResolvedValue(false);
    const input = request(validReport);
    const readBody = vi.spyOn(input, 'json');

    const response = await post(input);

    expect(response.status).toBe(204);
    expect(isAnalyticsEventEnabled).toHaveBeenCalledWith('web_vitals');
    expect(readBody).not.toHaveBeenCalled();
    expect(webVitalsRecorder.record).not.toHaveBeenCalled();
  });

  it('records only a strict privacy-minimized report', async () => {
    const response = await post(request(validReport));

    expect(response.status).toBe(204);
    expect(webVitalsRecorder.record).toHaveBeenCalledWith(validReport);
  });

  it('rejects unknown metrics, full URLs, and user identity', async () => {
    for (const report of [
      { ...validReport, metricName: 'FCP' },
      { ...validReport, fullUrl: 'https://example.com/private?email=person@example.com' },
      { ...validReport, userId: 'user-1' },
    ]) {
      const response = await post(request(report));
      expect(response.status).toBe(400);
    }
    expect(webVitalsRecorder.record).not.toHaveBeenCalled();
  });
});

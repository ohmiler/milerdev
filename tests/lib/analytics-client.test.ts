// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createProductExposureId,
  trackClientAnalyticsEvent,
} from '@/components/analytics/analytics-client';

const event = {
  eventName: 'course_viewed' as const,
  courseId: 'course-1',
  placement: 'course_detail' as const,
  exposureId: '123e4567-e89b-42d3-a456-426614174000',
};

describe('analytics browser delivery', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('creates the exposure identity from browser cryptographic randomness', () => {
    const randomUUID = vi.fn(() => '123e4567-e89b-42d3-a456-426614174000');

    expect(createProductExposureId(randomUUID)).toBe('123e4567-e89b-42d3-a456-426614174000');
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it('uses Beacon when the browser accepts the payload', () => {
    const sendBeacon = vi.fn(() => true);
    const fetchMock = vi.fn();
    vi.stubGlobal('navigator', { sendBeacon });
    vi.stubGlobal('fetch', fetchMock);

    trackClientAnalyticsEvent(event);

    expect(sendBeacon).toHaveBeenCalledWith(
      '/api/analytics/events',
      expect.any(Blob),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to keepalive fetch when Beacon rejects the payload', () => {
    const sendBeacon = vi.fn(() => false);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('navigator', { sendBeacon });
    vi.stubGlobal('fetch', fetchMock);

    trackClientAnalyticsEvent(event);

    expect(fetchMock).toHaveBeenCalledWith('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
    });
  });
});

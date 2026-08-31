import { describe, expect, it } from 'vitest';

import {
  clientAnalyticsEventSchema,
  serverAnalyticsEventSchema,
} from '@/lib/analytics-contract';

describe('analytics privacy contracts', () => {
  it('rejects prohibited client fields even when the base event is valid', () => {
    for (const prohibited of [
      { metadata: { campaign: 'anything' } },
      { name: 'Person' },
      { email: 'person@example.com' },
      { ipAddress: '127.0.0.1' },
      { userAgent: 'browser fingerprint' },
      { url: 'https://example.com/course?email=person@example.com' },
      { paymentPayload: { provider: 'secret' } },
      { slipContent: 'base64-slip' },
      { videoUrl: 'https://video.example/private' },
    ]) {
      expect(clientAnalyticsEventSchema.safeParse({
        eventName: 'course_viewed',
        exposureId: '11111111-1111-4111-8111-111111111111',
        courseId: 'course-1',
        placement: 'course_detail',
        ...prohibited,
      }).success).toBe(false);
    }
  });

  it('accepts only server event-specific identifiers', () => {
    expect(serverAnalyticsEventSchema.safeParse({
      eventName: 'registration_completed',
      userId: 'user-1',
    }).success).toBe(true);
    expect(serverAnalyticsEventSchema.safeParse({
      eventName: 'purchase_completed',
      userId: 'user-1',
      courseId: 'course-1',
      paymentId: 'payment-1',
    }).success).toBe(true);
    expect(serverAnalyticsEventSchema.safeParse({
      eventName: 'free_enrollment_completed',
      userId: 'user-1',
      bundleId: 'bundle-1',
    }).success).toBe(true);
  });

  it('rejects missing, conflicting, arbitrary, and prohibited server data', () => {
    expect(serverAnalyticsEventSchema.safeParse({
      eventName: 'purchase_completed',
      userId: 'user-1',
      courseId: 'course-1',
    }).success).toBe(false);
    expect(serverAnalyticsEventSchema.safeParse({
      eventName: 'free_enrollment_completed',
      userId: 'user-1',
      courseId: 'course-1',
      bundleId: 'bundle-1',
    }).success).toBe(false);
    expect(serverAnalyticsEventSchema.safeParse({
      eventName: 'registration_completed',
      userId: 'user-1',
      metadata: { anything: true },
    }).success).toBe(false);
    expect(serverAnalyticsEventSchema.safeParse({
      eventName: 'purchase_completed',
      userId: 'user-1',
      courseId: 'course-1',
      paymentId: 'payment-1',
      email: 'person@example.com',
    }).success).toBe(false);
  });
});

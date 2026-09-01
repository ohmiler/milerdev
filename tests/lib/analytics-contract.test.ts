import { describe, expect, it } from 'vitest';

import { clientAnalyticsEventSchema } from '@/lib/analytics-contract';

const exposureId = '11111111-1111-4111-8111-111111111111';

describe('client analytics event contract', () => {
  it('accepts only the allowed target shape for Course and Bundle events', () => {
    expect(clientAnalyticsEventSchema.safeParse({
      eventName: 'course_viewed',
      exposureId,
      courseId: 'course-1',
      placement: 'course_detail',
    }).success).toBe(true);
    expect(clientAnalyticsEventSchema.safeParse({
      eventName: 'bundle_viewed',
      exposureId,
      bundleId: 'bundle-1',
      placement: 'bundle_detail',
    }).success).toBe(true);
    expect(clientAnalyticsEventSchema.safeParse({
      eventName: 'checkout_opened',
      courseId: 'course-1',
      bundleId: 'bundle-1',
      placement: 'course_detail',
    }).success).toBe(false);
  });

  it('requires a random UUIDv4 identity only for product views', () => {
    expect(clientAnalyticsEventSchema.safeParse({
      eventName: 'course_viewed',
      courseId: 'course-1',
      placement: 'course_detail',
    }).success).toBe(false);
    expect(clientAnalyticsEventSchema.safeParse({
      eventName: 'bundle_viewed',
      exposureId: 'user-1:bundle-1',
      bundleId: 'bundle-1',
      placement: 'bundle_detail',
    }).success).toBe(false);
    expect(clientAnalyticsEventSchema.safeParse({
      eventName: 'checkout_opened',
      exposureId,
      courseId: 'course-1',
      placement: 'course_detail',
    }).success).toBe(false);
  });

  it('accepts only a browser-committed learning workspace exposure', () => {
    expect(clientAnalyticsEventSchema.safeParse({
      eventName: 'learning_workspace_started',
      exposureId,
      lessonId: 'lesson-1',
      placement: 'learning_workspace',
    }).success).toBe(true);
    expect(clientAnalyticsEventSchema.safeParse({
      eventName: 'learning_workspace_started',
      exposureId,
      courseId: 'course-1',
      lessonId: 'lesson-1',
      placement: 'learning_workspace',
    }).success).toBe(false);
    expect(clientAnalyticsEventSchema.safeParse({
      eventName: 'learning_workspace_started',
      lessonId: 'lesson-1',
      placement: 'learning_workspace',
    }).success).toBe(false);
  });

  it('rejects arbitrary metadata, identifiers, and event names', () => {
    expect(clientAnalyticsEventSchema.safeParse({
      eventName: 'purchase_completed',
      courseId: 'course-1',
      placement: 'course_detail',
    }).success).toBe(false);
    expect(clientAnalyticsEventSchema.safeParse({
      eventName: 'course_viewed',
      exposureId,
      courseId: 'course-1',
      placement: 'course_detail',
      email: 'learner@example.com',
    }).success).toBe(false);
  });

  it('keeps the Home CTA event anonymous and Hero-scoped', () => {
    expect(clientAnalyticsEventSchema.safeParse({
      eventName: 'home_primary_cta_clicked',
      placement: 'hero',
    }).success).toBe(true);
    expect(clientAnalyticsEventSchema.safeParse({
      eventName: 'home_primary_cta_clicked',
      courseId: 'course-1',
      placement: 'hero',
    }).success).toBe(false);
  });
});

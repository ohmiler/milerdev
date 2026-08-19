import { z } from 'zod';

export const CLIENT_ANALYTICS_EVENT_NAMES = [
  'home_primary_cta_clicked',
  'course_viewed',
  'bundle_viewed',
  'checkout_opened',
] as const;

export const SERVER_ANALYTICS_EVENT_NAMES = [
  'registration_completed',
  'payment_initiated',
  'purchase_completed',
  'free_enrollment_completed',
] as const;

export const analyticsPlacementSchema = z.enum([
  'hero',
  'catalog',
  'course_detail',
  'bundle_detail',
]);

const analyticsIdSchema = z.string().trim().min(1).max(36);

export const clientAnalyticsEventSchema = z.object({
  eventName: z.enum(CLIENT_ANALYTICS_EVENT_NAMES),
  courseId: analyticsIdSchema.optional(),
  bundleId: analyticsIdSchema.optional(),
  placement: analyticsPlacementSchema,
}).strict().superRefine((value, context) => {
  const hasCourse = Boolean(value.courseId);
  const hasBundle = Boolean(value.bundleId);

  if (value.eventName === 'home_primary_cta_clicked') {
    if (value.placement !== 'hero' || hasCourse || hasBundle) {
      context.addIssue({ code: 'custom', message: 'Invalid Home CTA event' });
    }
    return;
  }

  if (value.eventName === 'course_viewed') {
    if (!hasCourse || hasBundle || value.placement !== 'course_detail') {
      context.addIssue({ code: 'custom', message: 'Invalid Course view event' });
    }
    return;
  }

  if (value.eventName === 'bundle_viewed') {
    if (!hasBundle || hasCourse || value.placement !== 'bundle_detail') {
      context.addIssue({ code: 'custom', message: 'Invalid Bundle view event' });
    }
    return;
  }

  if (hasCourse === hasBundle || !['course_detail', 'bundle_detail'].includes(value.placement)) {
    context.addIssue({ code: 'custom', message: 'Checkout events require exactly one product' });
  }
});

export type ClientAnalyticsEvent = z.infer<typeof clientAnalyticsEventSchema>;
export type AnalyticsPlacement = z.infer<typeof analyticsPlacementSchema>;
export type ServerAnalyticsEventName = typeof SERVER_ANALYTICS_EVENT_NAMES[number];

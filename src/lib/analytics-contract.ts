import { z } from 'zod';

export const CLIENT_ANALYTICS_EVENT_NAMES = [
  'home_primary_cta_clicked',
  'course_viewed',
  'bundle_viewed',
  'checkout_opened',
  'learning_workspace_started',
] as const;

export const SERVER_ANALYTICS_EVENT_NAMES = [
  'registration_completed',
  'payment_initiated',
  'purchase_completed',
  'free_enrollment_completed',
  'lesson_completed',
  'course_completed',
] as const;

export const analyticsPlacementSchema = z.enum([
  'hero',
  'catalog',
  'course_detail',
  'bundle_detail',
  'learning_workspace',
]);

const analyticsIdSchema = z.string().trim().min(1).max(36);
export const analyticsExposureIdSchema = z.string().uuid().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
);

export const clientAnalyticsEventSchema = z.object({
  eventName: z.enum(CLIENT_ANALYTICS_EVENT_NAMES),
  exposureId: analyticsExposureIdSchema.optional(),
  courseId: analyticsIdSchema.optional(),
  bundleId: analyticsIdSchema.optional(),
  lessonId: analyticsIdSchema.optional(),
  placement: analyticsPlacementSchema,
}).strict().superRefine((value, context) => {
  const hasCourse = Boolean(value.courseId);
  const hasBundle = Boolean(value.bundleId);
  const hasLesson = Boolean(value.lessonId);

  if (value.eventName === 'home_primary_cta_clicked') {
    if (value.placement !== 'hero' || value.exposureId || hasCourse || hasBundle || hasLesson) {
      context.addIssue({ code: 'custom', message: 'Invalid Home CTA event' });
    }
    return;
  }

  if (value.eventName === 'course_viewed') {
    if (!value.exposureId || !hasCourse || hasBundle || hasLesson || value.placement !== 'course_detail') {
      context.addIssue({ code: 'custom', message: 'Invalid Course view event' });
    }
    return;
  }

  if (value.eventName === 'bundle_viewed') {
    if (!value.exposureId || !hasBundle || hasCourse || hasLesson || value.placement !== 'bundle_detail') {
      context.addIssue({ code: 'custom', message: 'Invalid Bundle view event' });
    }
    return;
  }

  if (value.eventName === 'learning_workspace_started') {
    if (!value.exposureId || !hasLesson || hasCourse || hasBundle || value.placement !== 'learning_workspace') {
      context.addIssue({ code: 'custom', message: 'Invalid Learning workspace event' });
    }
    return;
  }

  if (
    value.exposureId
    || hasLesson
    || hasCourse === hasBundle
    || !['course_detail', 'bundle_detail'].includes(value.placement)
  ) {
    context.addIssue({ code: 'custom', message: 'Checkout events require exactly one product' });
  }
});

export const serverAnalyticsEventSchema = z.object({
  eventName: z.enum(SERVER_ANALYTICS_EVENT_NAMES),
  userId: analyticsIdSchema.optional(),
  courseId: analyticsIdSchema.optional(),
  bundleId: analyticsIdSchema.optional(),
  paymentId: analyticsIdSchema.optional(),
  enrollmentId: analyticsIdSchema.optional(),
  factId: analyticsIdSchema.optional(),
  learningEnrollmentId: analyticsIdSchema.optional(),
  lessonId: analyticsIdSchema.optional(),
}).strict().superRefine((value, context) => {
  const hasCourse = Boolean(value.courseId);
  const hasBundle = Boolean(value.bundleId);
  const hasOneProduct = hasCourse !== hasBundle;
  const hasLearningIdentity = Boolean(value.factId) && Boolean(value.learningEnrollmentId);

  if (value.eventName === 'registration_completed') {
    if (
      !value.userId || hasCourse || hasBundle || value.paymentId || value.enrollmentId
      || value.factId || value.learningEnrollmentId || value.lessonId
    ) {
      context.addIssue({ code: 'custom', message: 'Invalid Registration event' });
    }
    return;
  }

  if (value.eventName === 'free_enrollment_completed') {
    if (
      !value.userId
      || !value.enrollmentId
      || !hasCourse
      || hasBundle
      || value.paymentId
      || value.factId
      || value.learningEnrollmentId
      || value.lessonId
    ) {
      context.addIssue({ code: 'custom', message: 'Invalid Free enrollment event' });
    }
    return;
  }

  if (value.eventName === 'lesson_completed' || value.eventName === 'course_completed') {
    const lessonShapeMatches = value.eventName === 'lesson_completed'
      ? Boolean(value.lessonId)
      : !value.lessonId;
    if (
      value.userId || value.bundleId || value.paymentId || value.enrollmentId
      || !hasCourse || !hasLearningIdentity || !lessonShapeMatches
    ) {
      context.addIssue({ code: 'custom', message: 'Invalid Learning milestone event' });
    }
    return;
  }

  if (
    !value.userId || !value.paymentId || value.enrollmentId || !hasOneProduct
    || value.factId || value.learningEnrollmentId || value.lessonId
  ) {
    context.addIssue({ code: 'custom', message: 'Paid events require a user, payment, and one product' });
  }
});

export type ClientAnalyticsEvent = z.infer<typeof clientAnalyticsEventSchema>;
export type ServerAnalyticsEvent = z.infer<typeof serverAnalyticsEventSchema>;
export type AnalyticsPlacement = z.infer<typeof analyticsPlacementSchema>;
export type ServerAnalyticsEventName = typeof SERVER_ANALYTICS_EVENT_NAMES[number];

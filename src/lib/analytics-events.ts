export const analyticsEventNames = [
  'course_view',
  'checkout_start',
  'payment_success',
  'lesson_completed',
] as const;

export type AnalyticsEventName = (typeof analyticsEventNames)[number];

export function isAnalyticsEventName(value: string): value is AnalyticsEventName {
  return (analyticsEventNames as readonly string[]).includes(value);
}

export const clientTrackableAnalyticsEvents = ['course_view', 'checkout_start'] as const;
export type ClientTrackableAnalyticsEvent = (typeof clientTrackableAnalyticsEvents)[number];

export function isClientTrackableAnalyticsEvent(value: string): value is ClientTrackableAnalyticsEvent {
  return (clientTrackableAnalyticsEvents as readonly string[]).includes(value);
}

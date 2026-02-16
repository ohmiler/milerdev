import type { ClientTrackableAnalyticsEvent } from '@/lib/analytics-events';

type AnalyticsMetadata = Record<string, unknown>;

interface TrackClientAnalyticsEventInput {
  eventName: ClientTrackableAnalyticsEvent;
  courseId?: string;
  bundleId?: string;
  paymentId?: string;
  metadata?: AnalyticsMetadata;
}

export async function trackClientAnalyticsEvent(input: TrackClientAnalyticsEventInput): Promise<void> {
  const payload = JSON.stringify({
    eventName: input.eventName,
    courseId: input.courseId,
    bundleId: input.bundleId,
    paymentId: input.paymentId,
    metadata: input.metadata,
  });

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/track', blob);
      return;
    }

    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    });
  } catch {
    // Do not block user actions on analytics failures.
  }
}

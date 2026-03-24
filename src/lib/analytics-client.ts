import type { ClientTrackableAnalyticsEvent } from '@/lib/analytics-events';

type AnalyticsMetadata = Record<string, unknown>;

const CLIENT_ANALYTICS_DEDUPE_WINDOWS_MS: Partial<Record<ClientTrackableAnalyticsEvent, number>> = {
  course_view: 6 * 60 * 60 * 1000,
  checkout_start: 15 * 60 * 1000,
};

const inMemoryAnalyticsEventCache = new Map<string, number>();

interface TrackClientAnalyticsEventInput {
  eventName: ClientTrackableAnalyticsEvent;
  courseId?: string;
  bundleId?: string;
  paymentId?: string;
  metadata?: AnalyticsMetadata;
}

function buildClientAnalyticsKey(input: TrackClientAnalyticsEventInput): string {
  const targetKey = input.courseId || input.bundleId || 'none';
  const paymentMethod = typeof input.metadata?.paymentMethod === 'string'
    ? input.metadata.paymentMethod.trim()
    : 'default';

  return [input.eventName, targetKey, paymentMethod].join(':');
}

function shouldSkipClientAnalyticsEvent(input: TrackClientAnalyticsEventInput): boolean {
  const dedupeWindowMs = CLIENT_ANALYTICS_DEDUPE_WINDOWS_MS[input.eventName];
  if (!dedupeWindowMs) {
    return false;
  }

  const cacheKey = buildClientAnalyticsKey(input);
  const now = Date.now();

  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const rawLastTrackedAt = window.sessionStorage.getItem(`analytics:${cacheKey}`);
      const lastTrackedAt = rawLastTrackedAt ? Number(rawLastTrackedAt) : 0;
      if (lastTrackedAt && now - lastTrackedAt < dedupeWindowMs) {
        return true;
      }
      window.sessionStorage.setItem(`analytics:${cacheKey}`, String(now));
      return false;
    }
  } catch {
    // Fall back to memory cache if sessionStorage is unavailable.
  }

  const lastTrackedAt = inMemoryAnalyticsEventCache.get(cacheKey) || 0;
  if (lastTrackedAt && now - lastTrackedAt < dedupeWindowMs) {
    return true;
  }

  inMemoryAnalyticsEventCache.set(cacheKey, now);
  return false;
}

export async function trackClientAnalyticsEvent(input: TrackClientAnalyticsEventInput): Promise<void> {
  if (shouldSkipClientAnalyticsEvent(input)) {
    return;
  }

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

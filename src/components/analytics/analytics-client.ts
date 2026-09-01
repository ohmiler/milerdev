'use client';

import type { ClientAnalyticsEvent } from '@/lib/analytics-contract';

export function createAnalyticsExposureId(
  randomUUID: () => string = () => crypto.randomUUID(),
): string {
  return randomUUID();
}

export const createProductExposureId = createAnalyticsExposureId;

export function trackClientAnalyticsEvent(event: ClientAnalyticsEvent): void {
  if (typeof window === 'undefined') return;

  const body = JSON.stringify(event);
  if (
    typeof navigator.sendBeacon === 'function'
    && navigator.sendBeacon(
      '/api/analytics/events',
      new Blob([body], { type: 'application/json' }),
    )
  ) {
    return;
  }

  void fetch('/api/analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

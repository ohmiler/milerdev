'use client';

import type { ClientAnalyticsEvent } from '@/lib/analytics-contract';

function eventDedupeKey(event: ClientAnalyticsEvent): string {
  return [
    'milerdev-analytics',
    event.eventName,
    event.courseId ?? '',
    event.bundleId ?? '',
    event.placement,
  ].join(':');
}

export function trackClientAnalyticsEvent(
  event: ClientAnalyticsEvent,
  options: { dedupeInSession?: boolean } = {},
): void {
  if (typeof window === 'undefined') return;

  if (options.dedupeInSession) {
    const key = eventDedupeKey(event);
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, '1');
    } catch {
      // Analytics remains best-effort when browser storage is unavailable.
    }
  }

  const body = JSON.stringify(event);
  if (typeof navigator.sendBeacon === 'function') {
    navigator.sendBeacon('/api/analytics/events', new Blob([body], { type: 'application/json' }));
    return;
  }

  void fetch('/api/analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

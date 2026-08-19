'use client';

import { useEffect } from 'react';

import type { ClientAnalyticsEvent } from '@/lib/analytics-contract';
import { trackClientAnalyticsEvent } from '@/components/analytics/analytics-client';

export default function AnalyticsViewEvent({ event }: { event: ClientAnalyticsEvent }) {
  useEffect(() => {
    trackClientAnalyticsEvent(event, { dedupeInSession: true });
  }, [event]);

  return null;
}

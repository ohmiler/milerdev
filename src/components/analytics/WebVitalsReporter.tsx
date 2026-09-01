'use client';

import { useReportWebVitals } from 'next/web-vitals';

import {
  initializeWebVitalsPageLoadContext,
  reportWebVitalMetric,
} from '@/components/analytics/web-vitals-client';

export default function WebVitalsReporter({ releaseIdentity }: { releaseIdentity: string }) {
  initializeWebVitalsPageLoadContext(releaseIdentity);
  useReportWebVitals(reportWebVitalMetric);
  return null;
}

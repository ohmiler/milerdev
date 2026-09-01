'use client';

import { useReportWebVitals } from 'next/web-vitals';

import { reportWebVitalMetric } from '@/components/analytics/web-vitals-client';

export default function WebVitalsReporter() {
  useReportWebVitals(reportWebVitalMetric);
  return null;
}

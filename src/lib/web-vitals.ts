import 'server-only';

import { z } from 'zod';

import { isAnalyticsEventEnabled } from '@/lib/analytics-control';
import { db } from '@/lib/db';
import { webVitals } from '@/lib/db/schema';
import {
  WEB_VITAL_DEVICE_CLASSES,
  WEB_VITAL_NAMES,
  WEB_VITAL_RATINGS,
  WEB_VITAL_ROUTE_FAMILIES,
  type WebVitalName,
  type WebVitalRating,
} from '@/lib/web-vitals-contract';

const MAX_DURATION_MS = 600_000;
const MAX_CLS = 10;

const releaseIdentitySchema = z.string().trim().min(1).max(100)
  .regex(/^[A-Za-z0-9._:-]+$/);

export function deriveWebVitalRating(
  metricName: WebVitalName,
  value: number,
): WebVitalRating {
  if (metricName === 'LCP') {
    if (value <= 2_500) return 'good';
    if (value <= 4_000) return 'needs-improvement';
    return 'poor';
  }
  if (metricName === 'INP') {
    if (value <= 200) return 'good';
    if (value <= 500) return 'needs-improvement';
    return 'poor';
  }
  if (value <= 0.1) return 'good';
  if (value <= 0.25) return 'needs-improvement';
  return 'poor';
}

export const webVitalReportSchema = z.object({
  pageLoadId: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9._:-]+$/),
  metricName: z.enum(WEB_VITAL_NAMES),
  routeFamily: z.enum(WEB_VITAL_ROUTE_FAMILIES),
  deviceClass: z.enum(WEB_VITAL_DEVICE_CLASSES),
  value: z.number().finite().min(0),
  rating: z.enum(WEB_VITAL_RATINGS),
}).strict().superRefine((report, context) => {
  const maximum = report.metricName === 'CLS' ? MAX_CLS : MAX_DURATION_MS;
  if (report.value > maximum) {
    context.addIssue({ code: 'custom', message: 'Web Vital value exceeds the accepted bound' });
  }
  if (report.rating !== deriveWebVitalRating(report.metricName, report.value)) {
    context.addIssue({ code: 'custom', message: 'Web Vital rating does not match its value' });
  }
});

export type WebVitalReport = z.infer<typeof webVitalReportSchema>;

export type StoredWebVital = Omit<WebVitalReport, 'value'> & {
  releaseIdentity: string;
  value: string;
  observedAt: Date;
};

export interface WebVitalsStore {
  upsert(metric: StoredWebVital): Promise<void>;
}

export function getWebVitalsReleaseIdentity(): string {
  return releaseIdentitySchema.parse(
    process.env.RAILWAY_GIT_COMMIT_SHA
      ?? process.env.VERCEL_GIT_COMMIT_SHA
      ?? process.env.GITHUB_SHA
      ?? 'local-development',
  );
}

export function createWebVitalsRecorder(input: {
  store: WebVitalsStore;
  isEventEnabled(eventName: 'web_vitals'): Promise<boolean>;
  getReleaseIdentity: () => string;
  now?: () => Date;
}) {
  const now = input.now ?? (() => new Date());

  return {
    async record(report: WebVitalReport): Promise<{
      status: 'recorded' | 'disabled' | 'ineligible' | 'failed';
    }> {
      const parsed = webVitalReportSchema.safeParse(report);
      if (!parsed.success) return { status: 'ineligible' };

      try {
        if (!(await input.isEventEnabled('web_vitals'))) return { status: 'disabled' };
        const releaseIdentity = releaseIdentitySchema.parse(input.getReleaseIdentity());
        await input.store.upsert({
          ...parsed.data,
          releaseIdentity,
          value: parsed.data.value.toFixed(4),
          observedAt: now(),
        });
        return { status: 'recorded' };
      } catch {
        return { status: 'failed' };
      }
    },
  };
}

const drizzleWebVitalsStore: WebVitalsStore = {
  async upsert(metric) {
    await db
      .insert(webVitals)
      .values({
        pageLoadId: metric.pageLoadId,
        metricName: metric.metricName,
        routeFamily: metric.routeFamily,
        deviceClass: metric.deviceClass,
        releaseIdentity: metric.releaseIdentity,
        value: metric.value,
        rating: metric.rating,
        createdAt: metric.observedAt,
        updatedAt: metric.observedAt,
      })
      .onDuplicateKeyUpdate({
        set: {
          routeFamily: metric.routeFamily,
          deviceClass: metric.deviceClass,
          releaseIdentity: metric.releaseIdentity,
          value: metric.value,
          rating: metric.rating,
          updatedAt: metric.observedAt,
        },
      });
  },
};

export const webVitalsRecorder = createWebVitalsRecorder({
  store: drizzleWebVitalsStore,
  isEventEnabled: isAnalyticsEventEnabled,
  getReleaseIdentity: getWebVitalsReleaseIdentity,
});

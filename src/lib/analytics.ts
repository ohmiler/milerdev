import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { analyticsEvents, courses, bundles, settings } from '@/lib/db/schema';
import { isDuplicateKeyError } from '@/lib/db/safe-insert';
import { logEvent } from '@/lib/error-handler';
import type {
  AnalyticsPlacement,
  ClientAnalyticsEvent,
  ServerAnalyticsEventName,
} from '@/lib/analytics-contract';

const ANALYTICS_SETTING_KEY = 'analytics_enabled';
const ANALYTICS_SETTING_CACHE_MS = 60_000;

let analyticsSettingCache: { enabled: boolean; expiresAt: number } | null = null;

export async function isAnalyticsEnabled(): Promise<boolean> {
  const now = Date.now();
  if (analyticsSettingCache && analyticsSettingCache.expiresAt > now) {
    return analyticsSettingCache.enabled;
  }

  const [setting] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, ANALYTICS_SETTING_KEY))
    .limit(1);
  const enabled = setting?.value?.trim().toLowerCase() === 'true';
  analyticsSettingCache = { enabled, expiresAt: now + ANALYTICS_SETTING_CACHE_MS };
  return enabled;
}

export function resetAnalyticsSettingCache(): void {
  analyticsSettingCache = null;
}

async function insertAnalyticsEvent(input: {
  eventName: ClientAnalyticsEvent['eventName'] | ServerAnalyticsEventName;
  source: 'client' | 'server';
  userId?: string | null;
  courseId?: string | null;
  bundleId?: string | null;
  paymentId?: string | null;
  placement?: AnalyticsPlacement;
}): Promise<boolean> {
  try {
    if (!(await isAnalyticsEnabled())) return false;

    await db.insert(analyticsEvents).values({
      eventName: input.eventName,
      source: input.source,
      userId: input.userId ?? null,
      courseId: input.courseId ?? null,
      bundleId: input.bundleId ?? null,
      paymentId: input.paymentId ?? null,
      metadata: input.placement ? JSON.stringify({ placement: input.placement }) : null,
      ipAddress: null,
      userAgent: null,
    });
    return true;
  } catch (error) {
    if (isDuplicateKeyError(error)) return true;
    logEvent('analytics.record_failed', 'warn');
    return false;
  }
}

export async function recordClientAnalyticsEvent(
  input: ClientAnalyticsEvent,
  userId?: string | null,
): Promise<boolean> {
  return insertAnalyticsEvent({
    ...input,
    source: 'client',
    userId,
  });
}

export async function recordServerAnalyticsEvent(input: {
  eventName: ServerAnalyticsEventName;
  userId?: string | null;
  courseId?: string | null;
  bundleId?: string | null;
  paymentId?: string | null;
}): Promise<boolean> {
  return insertAnalyticsEvent({ ...input, source: 'server' });
}

export async function isPublishedAnalyticsTarget(input: {
  courseId?: string;
  bundleId?: string;
}): Promise<boolean> {
  if (input.courseId) {
    const [course] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.id, input.courseId), eq(courses.status, 'published')))
      .limit(1);
    return Boolean(course);
  }

  if (input.bundleId) {
    const [bundle] = await db
      .select({ id: bundles.id })
      .from(bundles)
      .where(and(eq(bundles.id, input.bundleId), eq(bundles.status, 'published')))
      .limit(1);
    return Boolean(bundle);
  }

  return true;
}

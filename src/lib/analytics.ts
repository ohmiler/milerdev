import { and, eq } from 'drizzle-orm';

import {
  getAnalyticsControlState,
  isAnalyticsEventEnabled,
  resetAnalyticsControlCache,
} from '@/lib/analytics-control';
import {
  clientAnalyticsEventSchema,
  serverAnalyticsEventSchema,
  type AnalyticsPlacement,
  type ClientAnalyticsEvent,
  type ServerAnalyticsEvent,
  type ServerAnalyticsEventName,
} from '@/lib/analytics-contract';
import { db } from '@/lib/db';
import { analyticsEvents, bundles, courses } from '@/lib/db/schema';
import { isDuplicateKeyError } from '@/lib/db/safe-insert';
import { logEvent } from '@/lib/error-handler';

export async function isAnalyticsEnabled(): Promise<boolean> {
  return (await getAnalyticsControlState()).effectiveEnabled;
}

export function resetAnalyticsSettingCache(): void {
  resetAnalyticsControlCache();
}

async function insertAnalyticsEvent(input: {
  eventName: ClientAnalyticsEvent['eventName'] | ServerAnalyticsEventName;
  source: 'client' | 'server';
  userId?: string | null;
  courseId?: string | null;
  bundleId?: string | null;
  paymentId?: string | null;
  enrollmentId?: string | null;
  placement?: AnalyticsPlacement;
}): Promise<boolean> {
  try {
    if (!(await isAnalyticsEventEnabled(input.eventName))) return false;

    await db.insert(analyticsEvents).values({
      eventName: input.eventName,
      source: input.source,
      userId: input.userId ?? null,
      courseId: input.courseId ?? null,
      bundleId: input.bundleId ?? null,
      paymentId: input.paymentId ?? null,
      enrollmentId: input.enrollmentId ?? null,
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
  const parsed = clientAnalyticsEventSchema.safeParse(input);
  if (!parsed.success) return false;
  if (parsed.data.eventName === 'course_viewed' || parsed.data.eventName === 'bundle_viewed') {
    return false;
  }
  if (parsed.data.eventName === 'learning_workspace_started') return false;

  return insertAnalyticsEvent({
    ...parsed.data,
    source: 'client',
    userId,
  });
}

export async function recordServerAnalyticsEvent(input: ServerAnalyticsEvent): Promise<boolean> {
  const parsed = serverAnalyticsEventSchema.safeParse(input);
  if (!parsed.success) return false;
  if (
    parsed.data.eventName === 'purchase_completed'
    || parsed.data.eventName === 'free_enrollment_completed'
    || parsed.data.eventName === 'lesson_completed'
    || parsed.data.eventName === 'course_completed'
  ) return false;
  return insertAnalyticsEvent({ ...parsed.data, source: 'server' });
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

export { isAnalyticsEventEnabled };

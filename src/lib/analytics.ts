import { and, eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { db } from '@/lib/db';
import { analyticsEvents, settings } from '@/lib/db/schema';
import { isDuplicateKeyError } from '@/lib/db/safe-insert';
import type { AnalyticsEventName } from '@/lib/analytics-events';

const ANALYTICS_ENABLED_SETTING_KEY = 'analytics_enabled';
const ANALYTICS_SETTINGS_CACHE_TTL_MS = 60_000;

type AnalyticsSource = 'client' | 'server';

type JsonObject = Record<string, unknown>;

interface AnalyticsSettingsCache {
  value: boolean;
  expiresAt: number;
}

let analyticsSettingsCache: AnalyticsSettingsCache | null = null;

export interface TrackAnalyticsEventInput {
  eventName: AnalyticsEventName;
  userId?: string | null;
  courseId?: string | null;
  bundleId?: string | null;
  paymentId?: string | null;
  source?: AnalyticsSource;
  metadata?: JsonObject | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

function serializeMetadata(metadata?: JsonObject | null): string | null {
  if (!metadata || Object.keys(metadata).length === 0) {
    return null;
  }

  try {
    return JSON.stringify(metadata);
  } catch {
    return null;
  }
}

export function parseAnalyticsMetadata(metadata: string | null): JsonObject | null {
  if (!metadata) return null;

  try {
    const parsed = JSON.parse(metadata);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as JsonObject;
    }
  } catch {
    return null;
  }

  return null;
}

export function invalidateAnalyticsSettingsCache() {
  analyticsSettingsCache = null;
}

export async function isAnalyticsEnabled(): Promise<boolean> {
  const now = Date.now();
  if (analyticsSettingsCache && analyticsSettingsCache.expiresAt > now) {
    return analyticsSettingsCache.value;
  }

  const [analyticsSetting] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, ANALYTICS_ENABLED_SETTING_KEY))
    .limit(1);

  const enabled = analyticsSetting?.value === 'true';
  analyticsSettingsCache = {
    value: enabled,
    expiresAt: now + ANALYTICS_SETTINGS_CACHE_TTL_MS,
  };

  return enabled;
}

async function isDuplicatePaymentSuccessEvent(paymentId: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: analyticsEvents.id })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.eventName, 'payment_success'),
        eq(analyticsEvents.paymentId, paymentId)
      )
    )
    .limit(1);

  return !!existing;
}

export async function trackAnalyticsEvent(input: TrackAnalyticsEventInput): Promise<boolean> {
  try {
    if (!(await isAnalyticsEnabled())) {
      return false;
    }

    if (input.eventName === 'payment_success' && input.paymentId) {
      const duplicate = await isDuplicatePaymentSuccessEvent(input.paymentId);
      if (duplicate) {
        return false;
      }
    }

    await db.insert(analyticsEvents).values({
      id: createId(),
      eventName: input.eventName,
      userId: input.userId || null,
      courseId: input.courseId || null,
      bundleId: input.bundleId || null,
      paymentId: input.paymentId || null,
      source: input.source || 'server',
      metadata: serializeMetadata(input.metadata),
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
      createdAt: new Date(),
    });

    return true;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return false;
    }

    console.error('[Analytics] Failed to track event:', error);
    return false;
  }
}

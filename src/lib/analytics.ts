import { and, eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { db } from '@/lib/db';
import { analyticsEvents, settings } from '@/lib/db/schema';
import { isDuplicateKeyError } from '@/lib/db/safe-insert';
import type { AnalyticsEventName } from '@/lib/analytics-events';

const ANALYTICS_ENABLED_SETTING_KEY = 'analytics_enabled';
const ANALYTICS_SETTINGS_CACHE_TTL_MS = 60_000;
const ANALYTICS_METADATA_MAX_JSON_LENGTH = 512;
const ANALYTICS_USER_AGENT_MAX_LENGTH = 180;
const ANALYTICS_CLIENT_EVENT_DEDUPE_WINDOWS_MS: Partial<Record<AnalyticsEventName, number>> = {
  course_view: 6 * 60 * 60 * 1000,
  checkout_start: 15 * 60 * 1000,
};

type AnalyticsSource = 'client' | 'server';

type JsonObject = Record<string, unknown>;

interface AnalyticsSettingsCache {
  value: boolean;
  expiresAt: number;
}

interface RecentAnalyticsEventCacheEntry {
  expiresAt: number;
}

let analyticsSettingsCache: AnalyticsSettingsCache | null = null;
const recentAnalyticsEventCache = new Map<string, RecentAnalyticsEventCacheEntry>();

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

function normalizeAnalyticsString(value: string | null | undefined, maxLength: number): string | null {
  if (typeof value !== 'string') return null;

  const normalized = value.trim();
  if (!normalized || normalized === 'unknown' || normalized === 'server-render') {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function sanitizeMetadataValue(value: unknown): string | number | boolean | null {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized ? normalized.slice(0, 120) : null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? Number(value.toFixed(4)) : null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return null;
}

function sanitizeAnalyticsMetadata(metadata?: JsonObject | null): JsonObject | null {
  if (!metadata || Object.keys(metadata).length === 0) {
    return null;
  }

  const sanitizedEntries = Object.entries(metadata)
    .slice(0, 8)
    .map(([key, value]) => [key.slice(0, 40), sanitizeMetadataValue(value)] as const)
    .filter(([, value]) => value !== null);

  if (sanitizedEntries.length === 0) {
    return null;
  }

  return Object.fromEntries(sanitizedEntries);
}

function serializeMetadata(metadata?: JsonObject | null): string | null {
  const sanitizedMetadata = sanitizeAnalyticsMetadata(metadata);
  if (!sanitizedMetadata) {
    return null;
  }

  try {
    const serialized = JSON.stringify(sanitizedMetadata);
    return serialized.length > ANALYTICS_METADATA_MAX_JSON_LENGTH
      ? serialized.slice(0, ANALYTICS_METADATA_MAX_JSON_LENGTH)
      : serialized;
  } catch {
    return null;
  }
}

function pruneRecentAnalyticsEventCache(now: number) {
  for (const [key, entry] of recentAnalyticsEventCache.entries()) {
    if (entry.expiresAt <= now) {
      recentAnalyticsEventCache.delete(key);
    }
  }
}

function buildRecentAnalyticsEventKey(input: TrackAnalyticsEventInput): string | null {
  if (input.source !== 'client') {
    return null;
  }

  const dedupeWindowMs = ANALYTICS_CLIENT_EVENT_DEDUPE_WINDOWS_MS[input.eventName];
  if (!dedupeWindowMs) {
    return null;
  }

  const actorKey = normalizeAnalyticsString(input.userId, 64)
    || normalizeAnalyticsString(input.ipAddress, 45)
    || 'anonymous';
  const targetKey = normalizeAnalyticsString(input.courseId, 64)
    || normalizeAnalyticsString(input.bundleId, 64)
    || 'none';
  const paymentMethod = input.metadata && typeof input.metadata.paymentMethod === 'string'
    ? normalizeAnalyticsString(input.metadata.paymentMethod, 40)
    : null;

  return [input.eventName, actorKey, targetKey, paymentMethod || 'default'].join(':');
}

function shouldSkipRecentAnalyticsEvent(input: TrackAnalyticsEventInput): boolean {
  const dedupeWindowMs = ANALYTICS_CLIENT_EVENT_DEDUPE_WINDOWS_MS[input.eventName];
  if (!dedupeWindowMs) {
    return false;
  }

  const cacheKey = buildRecentAnalyticsEventKey(input);
  if (!cacheKey) {
    return false;
  }

  const now = Date.now();
  if (recentAnalyticsEventCache.size >= 500) {
    pruneRecentAnalyticsEventCache(now);
  }

  const existing = recentAnalyticsEventCache.get(cacheKey);
  if (existing && existing.expiresAt > now) {
    return true;
  }

  recentAnalyticsEventCache.set(cacheKey, {
    expiresAt: now + dedupeWindowMs,
  });

  return false;
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

    const normalizedInput: TrackAnalyticsEventInput = {
      ...input,
      metadata: sanitizeAnalyticsMetadata(input.metadata),
      ipAddress: normalizeAnalyticsString(input.ipAddress, 45),
      userAgent: normalizeAnalyticsString(input.userAgent, ANALYTICS_USER_AGENT_MAX_LENGTH),
    };

    if (shouldSkipRecentAnalyticsEvent(normalizedInput)) {
      return false;
    }

    if (normalizedInput.eventName === 'payment_success' && normalizedInput.paymentId) {
      const duplicate = await isDuplicatePaymentSuccessEvent(normalizedInput.paymentId);
      if (duplicate) {
        return false;
      }
    }

    await db.insert(analyticsEvents).values({
      id: createId(),
      eventName: normalizedInput.eventName,
      userId: normalizedInput.userId || null,
      courseId: normalizedInput.courseId || null,
      bundleId: normalizedInput.bundleId || null,
      paymentId: normalizedInput.paymentId || null,
      source: normalizedInput.source || 'server',
      metadata: serializeMetadata(normalizedInput.metadata),
      ipAddress: normalizedInput.ipAddress || null,
      userAgent: normalizedInput.userAgent || null,
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

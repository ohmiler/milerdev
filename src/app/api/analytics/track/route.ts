import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { auth } from '@/lib/auth';
import { trackAnalyticsEvent } from '@/lib/analytics';
import { isClientTrackableAnalyticsEvent } from '@/lib/analytics-events';
import { checkRateLimit, getClientIP, rateLimitResponse, rateLimits } from '@/lib/rate-limit';

function parseStringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function parseMetadata(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

// POST /api/analytics/track - Track client-side analytics events
export async function POST(request: Request) {
  try {
    const ipAddress = getClientIP(request);
    const rateLimit = checkRateLimit(`analytics:${ipAddress}`, rateLimits.api);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetTime);
    }

    const body = await request.json();
    const eventName = parseStringValue(body?.eventName);

    if (!eventName || !isClientTrackableAnalyticsEvent(eventName)) {
      return NextResponse.json({ error: 'Invalid event name' }, { status: 400 });
    }

    const courseId = parseStringValue(body?.courseId);
    const bundleId = parseStringValue(body?.bundleId);
    if (!courseId && !bundleId) {
      return NextResponse.json({ error: 'courseId or bundleId is required' }, { status: 400 });
    }

    const session = await auth();
    const userId = session?.user?.id || null;

    const tracked = await trackAnalyticsEvent({
      eventName,
      userId,
      courseId,
      bundleId,
      paymentId: parseStringValue(body?.paymentId),
      source: 'client',
      metadata: parseMetadata(body?.metadata),
      ipAddress,
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({ success: true, tracked });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error tracking analytics event:' });
    return NextResponse.json({ error: 'Failed to track analytics event' }, { status: 500 });
  }
}

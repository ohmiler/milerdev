import { NextResponse } from 'next/server';

import { clientAnalyticsEventSchema } from '@/lib/analytics-contract';
import {
  isAnalyticsEventEnabled,
  isPublishedAnalyticsTarget,
  recordClientAnalyticsEvent,
} from '@/lib/analytics';
import { auth } from '@/lib/auth';
import { logEvent } from '@/lib/error-handler';
import { checkRateLimit, getClientIP, rateLimits, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const clientIP = getClientIP(request);
  const rateLimit = checkRateLimit(`analytics:${clientIP}`, rateLimits.general);
  if (!rateLimit.success) return rateLimitResponse(rateLimit.resetTime);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid analytics event' }, { status: 400 });
  }

  const parsed = clientAnalyticsEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid analytics event' }, { status: 400 });
  }

  try {
    if (!(await isAnalyticsEventEnabled(parsed.data.eventName))) {
      return new NextResponse(null, { status: 204 });
    }

    if (!(await isPublishedAnalyticsTarget(parsed.data))) {
      return NextResponse.json({ error: 'Analytics target not found' }, { status: 404 });
    }

    const session = await auth();
    await recordClientAnalyticsEvent(parsed.data, session?.user?.id ?? null);
  } catch {
    logEvent('analytics.client_event_failed', 'warn');
  }

  return new NextResponse(null, { status: 204 });
}

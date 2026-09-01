import { NextResponse } from 'next/server';

import {
  isAnalyticsEventEnabled,
  isPublishedAnalyticsTarget,
  recordClientAnalyticsEvent,
} from '@/lib/analytics';
import { clientAnalyticsEventSchema } from '@/lib/analytics-contract';
import { auth } from '@/lib/auth';
import { logEvent } from '@/lib/error-handler';
import { measurementRecorder } from '@/lib/measurement-recorder';
import { learningMeasurementRecorder } from '@/lib/learning-measurement';
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
    if (parsed.data.eventName === 'course_viewed' || parsed.data.eventName === 'bundle_viewed') {
      const productType = parsed.data.eventName === 'course_viewed' ? 'course' : 'bundle';
      const productId = productType === 'course' ? parsed.data.courseId : parsed.data.bundleId;
      if (!parsed.data.exposureId || !productId) {
        return NextResponse.json({ error: 'Invalid analytics event' }, { status: 400 });
      }

      const result = await measurementRecorder.recordProductExposure({
        exposureId: parsed.data.exposureId,
        productType,
        productId,
      });
      if (result.status === 'ineligible') {
        return NextResponse.json({ error: 'Analytics target not found' }, { status: 404 });
      }
      return new NextResponse(null, { status: 204 });
    }

    if (parsed.data.eventName === 'learning_workspace_started') {
      if (!parsed.data.exposureId || !parsed.data.lessonId) {
        return NextResponse.json({ error: 'Invalid analytics event' }, { status: 400 });
      }
      if (!(await isAnalyticsEventEnabled('learning_workspace_started'))) {
        return new NextResponse(null, { status: 204 });
      }
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const result = await learningMeasurementRecorder.recordWorkspaceStart({
        exposureId: parsed.data.exposureId,
        userId: session.user.id,
        lessonId: parsed.data.lessonId,
      });
      if (result.status === 'ineligible') {
        return NextResponse.json({ error: 'Analytics target not found' }, { status: 404 });
      }
      return new NextResponse(null, { status: 204 });
    }

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

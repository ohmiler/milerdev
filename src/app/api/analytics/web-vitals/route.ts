import { NextResponse } from 'next/server';

import { isAnalyticsEventEnabled } from '@/lib/analytics-control';
import { logEvent } from '@/lib/error-handler';
import { checkRateLimit, getClientIP, rateLimits, rateLimitResponse } from '@/lib/rate-limit';
import { webVitalReportSchema, webVitalsRecorder } from '@/lib/web-vitals';

export async function POST(request: Request) {
  const clientIP = getClientIP(request);
  const rateLimit = checkRateLimit(`web-vitals:${clientIP}`, rateLimits.general);
  if (!rateLimit.success) return rateLimitResponse(rateLimit.resetTime);

  try {
    if (!(await isAnalyticsEventEnabled('web_vitals'))) {
      return new NextResponse(null, { status: 204 });
    }
  } catch {
    logEvent('analytics.web_vitals_control_failed', 'warn');
    return new NextResponse(null, { status: 204 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid Web Vitals report' }, { status: 400 });
  }
  const parsed = webVitalReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid Web Vitals report' }, { status: 400 });
  }

  const result = await webVitalsRecorder.record(parsed.data);
  if (result.status === 'failed') {
    logEvent('analytics.web_vitals_record_failed', 'warn');
  }
  return new NextResponse(null, { status: 204 });
}

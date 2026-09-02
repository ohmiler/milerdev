import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { repairOwnerCertificate } from '@/lib/certificate-credentials';
import { checkRateLimit, rateLimits, rateLimitResponse } from '@/lib/rate-limit';

const repairSchema = z.object({
  courseSlug: z.string().trim().min(1).max(255),
}).strict();

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = checkRateLimit(
    `certificate-repair:${session.user.id}`,
    rateLimits.sensitive,
  );
  if (!rateLimit.success) return rateLimitResponse(rateLimit.resetTime);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid certificate repair request' }, { status: 400 });
  }
  const parsed = repairSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid certificate repair request' }, { status: 400 });
  }

  const result = await repairOwnerCertificate(
    session.user.id,
    parsed.data.courseSlug,
  );
  const status = result.kind === 'issued'
    ? 201
    : result.kind === 'revoked' || result.kind === 'not_completed'
      ? 409
      : result.kind === 'temporarily_unavailable'
        ? 503
        : 200;
  return NextResponse.json({ result }, { status });
}

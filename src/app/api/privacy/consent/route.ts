import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { readBrowserConsent, saveBrowserConsent } from '@/lib/privacy-consent';
import { CONSENT_COOKIE, CONSENT_MAX_AGE_SECONDS, consentChoiceSchema } from '@/lib/privacy-consent-contract';
import { checkRateLimit, getClientIP, rateLimits, rateLimitResponse } from '@/lib/rate-limit';

const headers = { 'Cache-Control': 'private, no-store' };

export async function GET() {
  const session = await auth();
  return NextResponse.json(await readBrowserConsent(session?.user?.id ?? null), { headers });
}

export async function POST(request: Request) {
  // Next's internal request URL can differ behind the production proxy.
  // Trust the configured public origin, never caller-supplied forwarded headers.
  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || request.url).origin;
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers });
  }
  if (request.headers.get('origin') !== expectedOrigin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers });
  }
  const limit = checkRateLimit(`privacy-consent:${getClientIP(request)}`, rateLimits.general);
  if (!limit.success) return rateLimitResponse(limit.resetTime);
  if (Number(request.headers.get('content-length') ?? 0) > 1024) {
    return NextResponse.json({ error: 'Invalid choice' }, { status: 400, headers });
  }
  let body: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ error: 'Invalid choice' }, { status: 400, headers });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 1024) {
        await reader.cancel();
        return NextResponse.json({ error: 'Invalid choice' }, { status: 400, headers });
      }
      chunks.push(part.value);
    }
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return NextResponse.json({ error: 'Invalid choice' }, { status: 400, headers });
  }
  const parsed = consentChoiceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid choice' }, { status: 400, headers });
  try {
    const session = await auth();
    const result = await saveBrowserConsent(session?.user?.id ?? null, parsed.data.analytics);
    const response = NextResponse.json(result.status, { headers });
    response.cookies.set(CONSENT_COOKIE, result.token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/',
      maxAge: CONSENT_MAX_AGE_SECONDS,
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'บันทึกตัวเลือกไม่สำเร็จ กรุณาลองอีกครั้ง' }, { status: 503, headers });
  }
}

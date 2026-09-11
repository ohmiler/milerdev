import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { getClientIP, rateLimits, rateLimitResponse } from '@/lib/rate-limit';
import { authRateLimitUnavailableResponse, consumeAuthRateLimit } from '@/lib/auth-rate-limit';
import { REGISTRATION_ACCEPTED, requestEmailRegistration } from '@/lib/email-registration';

const schema = z.object({
    email: z.string().trim().email('รูปแบบอีเมลไม่ถูกต้อง').max(255),
    callbackUrl: z.unknown().optional(),
});

export async function POST(request: Request) {
    try {
        const ipLimit = await consumeAuthRateLimit({
            namespace: 'register', identifier: getClientIP(request), ...rateLimits.auth,
        }).catch(() => null);
        if (!ipLimit) return authRateLimitUnavailableResponse();
        if (!ipLimit.success) return rateLimitResponse(ipLimit.resetTime);
        const validation = schema.safeParse(await request.json().catch(() => null));
        if (!validation.success) return NextResponse.json({ error: 'กรุณากรอกอีเมลให้ถูกต้อง' }, { status: 400 });
        const email = validation.data.email.toLowerCase();
        const identifier = createHash('sha256').update(email).digest('hex');
        // Same neutral response for all account states and mailbox throttling.
        for (const limit of [
            { namespace: 'register-email-minute', maxRequests: 1, windowMs: 60_000 },
            { namespace: 'register-email-hour', maxRequests: 3, windowMs: 3_600_000 },
        ]) {
            const result = await consumeAuthRateLimit({ ...limit, identifier }).catch(() => null);
            if (!result) return authRateLimitUnavailableResponse();
            if (!result.success) return NextResponse.json(REGISTRATION_ACCEPTED);
        }
        // Ignore password/name/role from old clients: the mailbox holder must
        // choose fresh credentials when redeeming the emailed token.
        await requestEmailRegistration(email, validation.data.callbackUrl);
        return NextResponse.json(REGISTRATION_ACCEPTED);
    } catch {
        console.error('[Registration] Request failed');
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });
    }
}

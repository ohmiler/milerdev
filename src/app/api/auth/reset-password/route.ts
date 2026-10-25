import { after, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { sendPasswordResetEmail } from '@/lib/notifications/email';
import { randomBytes, createHash } from 'crypto';
import { getClientThrottleKey, rateLimits, rateLimitResponse } from '@/lib/security/rate-limit';
import {
    authRateLimitUnavailableResponse,
    consumeAuthRateLimit,
} from '@/lib/auth/rate-limit';
import { resolveSafeAuthReturn, type SafeAuthReturnPath } from '@/lib/auth/safe-auth-return';
import { logError } from '@/lib/error-handler';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const DUPLICATE_RESET_SUPPRESSION_MS = 5 * 60 * 1000;
const RESET_REQUEST_ACCEPTED = {
    message: 'ตรวจสอบคำขอแล้ว',
    retryAfterSeconds: DUPLICATE_RESET_SUPPRESSION_MS / 1000,
};

const resetSchema = z.object({
    email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
    callbackUrl: z.unknown().optional(),
});

export async function POST(request: Request) {
    try {
        // Rate limiting
        const throttleKey = getClientThrottleKey(request);
        const rateLimit = await consumeAuthRateLimit({
            namespace: 'reset',
            identifier: throttleKey,
            ...rateLimits.auth,
        }).catch(() => null);

        if (!rateLimit) {
            return authRateLimitUnavailableResponse();
        }
        
        if (!rateLimit.success) {
            return rateLimitResponse(rateLimit.resetTime);
        }

        const body = await request.json();
        const validation = resetSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const email = validation.data.email.toLowerCase().trim();
        const { pathname: returnTo } = resolveSafeAuthReturn(validation.data.callbackUrl);

        // What happens next depends on the account: a missing, deactivated or recently reset one
        // stops after one read, an active one waits for two writes and an email provider round
        // trip. It runs after the neutral response is sent, so the response time is the same for
        // every email.
        after(() => issuePasswordReset(email, returnTo).catch((error) => {
            logError(error, { action: 'auth.reset.request_failed' });
        }));

        return NextResponse.json(RESET_REQUEST_ACCEPTED);
    } catch {
        console.error('Password reset request failed');
        return NextResponse.json(
            { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
            { status: 500 }
        );
    }
}

/** Issues and emails a reset link when the email belongs to an active account without a fresh one. */
async function issuePasswordReset(email: string, returnTo: SafeAuthReturnPath): Promise<void> {
    // Check if user exists
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

    // No reset for a missing or deactivated account; the caller already answered the same way.
    if (!user || user.deactivatedAt !== null) {
        return;
    }

    const now = Date.now();
    const resetExpiresAt = user.resetExpires?.getTime();
    const hasFreshResetToken =
        !!user.resetToken &&
        typeof resetExpiresAt === 'number' &&
        resetExpiresAt - now > RESET_TOKEN_TTL_MS - DUPLICATE_RESET_SUPPRESSION_MS;

    // Avoid invalidating the email that was just sent if the user taps submit twice
    // or requests another reset before the first message arrives.
    if (hasFreshResetToken) {
        return;
    }

    // Generate cryptographically secure reset token
    const resetToken = randomBytes(32).toString('hex');
    const resetTokenHash = createHash('sha256').update(resetToken).digest('hex');
    const resetExpires = new Date(now + RESET_TOKEN_TTL_MS);

    // Store hashed token in DB (plaintext sent to user via email)
    const issueResult = await db
        .update(users)
        .set({
            resetToken: resetTokenHash,
            resetExpires,
        })
        .where(and(eq(users.id, user.id), isNull(users.deactivatedAt)));

    if (issueResult[0]?.affectedRows !== 1) {
        return;
    }

    if (user.email) {
        const emailSent = await sendPasswordResetEmail({
            email: user.email,
            name: user.name,
            resetToken,
            returnTo,
        });

        if (!emailSent) {
            await db
                .update(users)
                .set({
                    resetToken: null,
                    resetExpires: null,
                })
                .where(and(
                    eq(users.id, user.id),
                    eq(users.resetToken, resetTokenHash)
                ));

            console.error('[Reset] Password reset email delivery failed');
        }
    }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { sendPasswordResetEmail } from '@/lib/email';
import { randomBytes, createHash } from 'crypto';
import { getClientIP, rateLimits, rateLimitResponse } from '@/lib/rate-limit';
import {
    authRateLimitUnavailableResponse,
    consumeAuthRateLimit,
} from '@/lib/auth-rate-limit';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const DUPLICATE_RESET_SUPPRESSION_MS = 5 * 60 * 1000;

const resetSchema = z.object({
    email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
});

export async function POST(request: Request) {
    try {
        const genericMessage = 'หากอีเมลนี้มีในระบบ คุณจะได้รับลิงก์รีเซ็ตรหัสผ่าน';

        // Rate limiting
        const clientIP = getClientIP(request);
        const rateLimit = await consumeAuthRateLimit({
            namespace: 'reset',
            identifier: clientIP,
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

        // Check if user exists
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        // Always return success to prevent email enumeration
        if (!user) {
            return NextResponse.json({
                message: genericMessage
            });
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
            return NextResponse.json({ message: genericMessage });
        }

        // Generate cryptographically secure reset token
        const resetToken = randomBytes(32).toString('hex');
        const resetTokenHash = createHash('sha256').update(resetToken).digest('hex');
        const resetExpires = new Date(now + RESET_TOKEN_TTL_MS);

        // Store hashed token in DB (plaintext sent to user via email)
        await db
            .update(users)
            .set({
                resetToken: resetTokenHash,
                resetExpires,
            })
            .where(eq(users.id, user.id));

        // Wait for delivery so serverless runtimes do not end the request first.
        if (user.email) {
            const emailSent = await sendPasswordResetEmail({
                email: user.email,
                name: user.name,
                resetToken,
            });

            if (!emailSent) {
                await db
                    .update(users)
                    .set({
                        resetToken: null,
                        resetExpires: null,
                    })
                    .where(eq(users.id, user.id));

                console.error('[Reset] Password reset email delivery failed');
            }
        }

        return NextResponse.json({
            message: genericMessage
        });
    } catch (error) {
        console.error('Password reset error:', error);
        return NextResponse.json(
            { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
            { status: 500 }
        );
    }
}


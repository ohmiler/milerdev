import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and, gt, isNull, sql } from 'drizzle-orm';
import { hashNewPassword } from '@/lib/password-storage';
import { z } from 'zod';
import { getClientIP, rateLimits, rateLimitResponse } from '@/lib/rate-limit';
import {
    authRateLimitUnavailableResponse,
    consumeAuthRateLimit,
} from '@/lib/auth-rate-limit';
import { createHash } from 'crypto';
import { newPasswordSchema } from '@/lib/password-validation';
import { PasswordSecurityError } from '@/lib/password-errors';

const confirmResetSchema = z.object({
    token: z.string().min(1, 'Token ไม่ถูกต้อง'),
    newPassword: newPasswordSchema,
});

function invalidResetLinkResponse() {
    return NextResponse.json(
        {
            kind: 'invalid_or_expired_link',
            error: 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว',
        },
        { status: 400 }
    );
}

export async function POST(request: Request) {
    try {
        // Rate limiting
        const clientIP = getClientIP(request);
        const rateLimit = await consumeAuthRateLimit({
            namespace: 'reset-confirm',
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
        const validation = confirmResetSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { token, newPassword } = validation.data;

        // Hash the incoming token to compare against stored hash
        const tokenHash = createHash('sha256').update(token).digest('hex');

        // Find user with valid (non-expired) reset token
        const [user] = await db
            .select()
            .from(users)
            .where(
                and(
                    eq(users.resetToken, tokenHash),
                    gt(users.resetExpires, new Date()),
                    isNull(users.deactivatedAt)
                )
            )
            .limit(1);

        if (!user || user.deactivatedAt !== null) {
            return invalidResetLinkResponse();
        }

        // Hash new password and clear reset token
        const passwordHash = await hashNewPassword(newPassword);

        const updateResult = await db
            .update(users)
            .set({
                passwordHash,
                resetToken: null,
                resetExpires: null,
                sessionVersion: sql`${users.sessionVersion} + 1`,
                updatedAt: new Date(),
            })
            .where(and(
                eq(users.id, user.id),
                eq(users.resetToken, tokenHash),
                gt(users.resetExpires, new Date()),
                isNull(users.deactivatedAt)
            ));

        if (updateResult[0]?.affectedRows !== 1) {
            return invalidResetLinkResponse();
        }

        return NextResponse.json({
            message: 'ตั้งรหัสผ่านใหม่สำเร็จ',
        });
    } catch (error) {
        if (error instanceof PasswordSecurityError) return NextResponse.json({ error: error.message }, { status: error.status });
        console.error('Password reset confirmation failed');
        return NextResponse.json(
            { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
            { status: 500 }
        );
    }
}


import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and, gt, isNull, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getClientIP, rateLimits, rateLimitResponse } from '@/lib/rate-limit';
import {
    authRateLimitUnavailableResponse,
    consumeAuthRateLimit,
} from '@/lib/auth-rate-limit';
import { createHash } from 'crypto';

const confirmResetSchema = z.object({
    token: z.string().min(1, 'Token ไม่ถูกต้อง'),
    newPassword: z
        .string()
        .min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
        .regex(/[A-Z]/, 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว')
        .regex(/[a-z]/, 'รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว')
        .regex(/[0-9]/, 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว'),
});

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
            return NextResponse.json(
                { error: 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว' },
                { status: 400 }
            );
        }

        // Hash new password and clear reset token
        const passwordHash = await bcrypt.hash(newPassword, 12);

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
            return NextResponse.json(
                { error: 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            message: 'ตั้งรหัสผ่านใหม่สำเร็จ',
        });
    } catch {
        console.error('Password reset confirmation failed');
        return NextResponse.json(
            { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
            { status: 500 }
        );
    }
}


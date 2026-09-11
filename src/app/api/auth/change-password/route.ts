import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { hashNewPassword, verifyPassword } from '@/lib/password-storage';
import { z } from 'zod';
import { newPasswordSchema } from '@/lib/password-validation';
import { PasswordSecurityError } from '@/lib/password-errors';
import { auth } from '@/lib/auth';
import { getClientIP, rateLimits, rateLimitResponse } from '@/lib/rate-limit';
import {
    authRateLimitUnavailableResponse,
    consumeAuthRateLimit,
} from '@/lib/auth-rate-limit';

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'กรุณากรอกรหัสผ่านปัจจุบัน'),
    newPassword: newPasswordSchema,
});

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'กรุณาเข้าสู่ระบบ' },
                { status: 401 }
            );
        }

        // Rate limiting
        const clientIP = getClientIP(request);
        const rateLimit = await consumeAuthRateLimit({
            namespace: 'change-pw',
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
        const validation = changePasswordSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { currentPassword, newPassword } = validation.data;

        // Get user from DB
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, session.user.id))
            .limit(1);

        if (!user) {
            return NextResponse.json(
                { error: 'ไม่พบบัญชีผู้ใช้' },
                { status: 404 }
            );
        }

        // Check if user has a password (OAuth users may not)
        if (!user.passwordHash) {
            return NextResponse.json(
                { error: 'บัญชีนี้ใช้การเข้าสู่ระบบผ่าน Google ไม่สามารถเปลี่ยนรหัสผ่านได้' },
                { status: 400 }
            );
        }

        // Verify current password
        const isValid = await verifyPassword(currentPassword, user.passwordHash);
        if (!isValid) {
            return NextResponse.json(
                { error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' },
                { status: 400 }
            );
        }

        // Prevent using same password
        const isSame = await verifyPassword(newPassword, user.passwordHash);
        if (isSame) {
            return NextResponse.json(
                { error: 'รหัสผ่านใหม่ต้องไม่เหมือนรหัสผ่านเดิม' },
                { status: 400 }
            );
        }

        // Hash and update
        const newHash = await hashNewPassword(newPassword);
        const updateResult = await db
            .update(users)
            .set({
                passwordHash: newHash,
                resetToken: null,
                resetExpires: null,
                sessionVersion: sql`${users.sessionVersion} + 1`,
                updatedAt: new Date(),
            })
            .where(and(
                eq(users.id, session.user.id),
                eq(users.passwordHash, user.passwordHash)
            ));

        if (updateResult[0]?.affectedRows !== 1) {
            return NextResponse.json(
                { error: 'บัญชีมีการเปลี่ยนแปลง กรุณาเข้าสู่ระบบแล้วลองใหม่' },
                { status: 409 }
            );
        }

        return NextResponse.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
    } catch (error) {
        if (error instanceof PasswordSecurityError) return NextResponse.json({ error: error.message }, { status: error.status });
        console.error('Password change failed');
        return NextResponse.json(
            { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
            { status: 500 }
        );
    }
}


import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getClientIP, rateLimits, rateLimitResponse } from '@/lib/rate-limit';
import { authRateLimitUnavailableResponse, consumeAuthRateLimit } from '@/lib/auth-rate-limit';
import { completeEmailRegistration } from '@/lib/email-registration';
import { getPasswordPolicyError } from '@/lib/password-policy';

const schema = z.object({
    token: z.string().regex(/^[a-f0-9]{64}$/),
    name: z.string().trim().min(2).max(100),
    password: z.string().min(8).max(72).refine((value) => !getPasswordPolicyError(value)),
});

export async function POST(request: Request) {
    try {
        const limit = await consumeAuthRateLimit({
            namespace: 'register-confirm', identifier: getClientIP(request), ...rateLimits.auth,
        }).catch(() => null);
        if (!limit) return authRateLimitUnavailableResponse();
        if (!limit.success) return rateLimitResponse(limit.resetTime);
        const validation = schema.safeParse(await request.json().catch(() => null));
        if (!validation.success) return NextResponse.json({ error: 'กรุณาตรวจสอบลิงก์ ชื่อ และรหัสผ่าน' }, { status: 400 });
        const { token, name, password } = validation.data;
        const result = await completeEmailRegistration(token, name, password);
        if (!result) return NextResponse.json({
            kind: 'invalid_or_expired_link',
            error: 'ลิงก์ไม่ถูกต้อง หมดอายุ หรืออีเมลนี้มีบัญชีแล้ว กรุณาขอลิงก์ใหม่หรือเข้าสู่ระบบ',
        }, { status: 400 });
        return NextResponse.json({ message: 'ยืนยันอีเมลและสร้างบัญชีแล้ว', ...result });
    } catch {
        console.error('[Registration] Confirmation failed');
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });
    }
}

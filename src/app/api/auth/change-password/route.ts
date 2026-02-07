import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { checkRateLimit, getClientIP, rateLimits, rateLimitResponse } from '@/lib/rate-limit';

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'กรุณากรอกรหัสผ่านปัจจุบัน'),
    newPassword: z
        .string()
        .min(8, 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร')
        .regex(/[A-Z]/, 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว')
        .regex(/[a-z]/, 'รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว')
        .regex(/[0-9]/, 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว'),
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
        const rateLimit = checkRateLimit(`change-pw:${clientIP}`, rateLimits.auth);

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
        const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValid) {
            return NextResponse.json(
                { error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' },
                { status: 400 }
            );
        }

        // Prevent using same password
        const isSame = await bcrypt.compare(newPassword, user.passwordHash);
        if (isSame) {
            return NextResponse.json(
                { error: 'รหัสผ่านใหม่ต้องไม่เหมือนรหัสผ่านเดิม' },
                { status: 400 }
            );
        }

        // Hash and update
        const newHash = await bcrypt.hash(newPassword, 12);
        await db
            .update(users)
            .set({
                passwordHash: newHash,
                updatedAt: new Date(),
            })
            .where(eq(users.id, session.user.id));

        return NextResponse.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
    } catch (error) {
        console.error('Change password error:', error);
        return NextResponse.json(
            { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
            { status: 500 }
        );
    }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { sendPasswordResetEmail } from '@/lib/email';
import { createId } from '@paralleldrive/cuid2';
import { checkRateLimit, getClientIP, rateLimits, rateLimitResponse } from '@/lib/rate-limit';

const resetSchema = z.object({
    email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
});

export async function POST(request: Request) {
    try {
        // Rate limiting
        const clientIP = getClientIP(request);
        const rateLimit = checkRateLimit(`reset:${clientIP}`, rateLimits.auth);
        
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
                message: 'หากอีเมลนี้มีในระบบ คุณจะได้รับลิงก์รีเซ็ตรหัสผ่าน'
            });
        }

        // Generate reset token
        const resetToken = createId();
        const resetExpires = new Date(Date.now() + 3600000); // 1 hour

        // Update user with reset token
        await db
            .update(users)
            .set({
                resetToken,
                resetExpires,
            })
            .where(eq(users.id, user.id));

        // Send reset email (fire-and-forget to avoid blocking response)
        if (user.email) {
            sendPasswordResetEmail({
                email: user.email,
                name: user.name,
                resetToken,
            }).catch(err => console.error('[Reset] Email send failed:', err));
        }

        return NextResponse.json({
            message: 'หากอีเมลนี้มีในระบบ คุณจะได้รับลิงก์รีเซ็ตรหัสผ่าน'
        });
    } catch (error) {
        console.error('Password reset error:', error);
        return NextResponse.json(
            { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
            { status: 500 }
        );
    }
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIP, rateLimits, rateLimitResponse } from '@/lib/rate-limit';
import { sendContactNotification } from '@/lib/email';

const contactSchema = z.object({
    name: z.string().min(2, 'กรุณากรอกชื่อ').max(100),
    email: z.string().email('อีเมลไม่ถูกต้อง').max(255),
    subject: z.string().min(2, 'กรุณากรอกหัวข้อ').max(200),
    message: z.string().min(10, 'กรุณากรอกข้อความอย่างน้อย 10 ตัวอักษร').max(5000),
    // Anti-spam fields
    _honey: z.string().max(0, 'spam').optional(), // Honeypot — must be empty
    _timestamp: z.number(), // Form load timestamp
});

export async function POST(request: Request) {
    try {
        // Rate limiting — 3 submissions per 10 minutes per IP
        const clientIP = getClientIP(request);
        const rateLimit = checkRateLimit(`contact:${clientIP}`, {
            maxRequests: 3,
            windowMs: 10 * 60 * 1000, // 10 minutes
        });

        if (!rateLimit.success) {
            return rateLimitResponse(rateLimit.resetTime);
        }

        const body = await request.json();
        const validation = contactSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { name, email, subject, message, _honey, _timestamp } = validation.data;

        // Anti-spam: Honeypot check
        if (_honey) {
            // Bot filled the hidden field — silently reject
            return NextResponse.json({ success: true });
        }

        // Anti-spam: Time check — reject if submitted in less than 3 seconds
        const elapsed = Date.now() - _timestamp;
        if (elapsed < 3000) {
            // Too fast — likely a bot
            return NextResponse.json({ success: true });
        }

        // Send email to admin via Resend (or SMTP fallback)
        await sendContactNotification({ name, email, subject, message, clientIP });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Contact form error:', error);
        return NextResponse.json(
            { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
            { status: 500 }
        );
    }
}

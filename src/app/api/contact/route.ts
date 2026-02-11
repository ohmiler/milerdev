import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIP, rateLimits, rateLimitResponse } from '@/lib/rate-limit';
import nodemailer from 'nodemailer';

const contactSchema = z.object({
    name: z.string().min(2, 'กรุณากรอกชื่อ').max(100),
    email: z.string().email('อีเมลไม่ถูกต้อง').max(255),
    subject: z.string().min(2, 'กรุณากรอกหัวข้อ').max(200),
    message: z.string().min(10, 'กรุณากรอกข้อความอย่างน้อย 10 ตัวอักษร').max(5000),
    // Anti-spam fields
    _honey: z.string().max(0, 'spam').optional(), // Honeypot — must be empty
    _timestamp: z.number(), // Form load timestamp
});

function getTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

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

        // Send email to admin
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.warn('[Contact] SMTP not configured, logging message instead');
            console.log('[Contact] From:', name, email, '| Subject:', subject, '| Message:', message);
            return NextResponse.json({ success: true });
        }

        const adminEmail = process.env.CONTACT_EMAIL || process.env.SMTP_USER || 'milerdev.official@gmail.com';

        await getTransporter().sendMail({
            from: `MilerDev Contact <${process.env.SMTP_USER}>`,
            to: adminEmail,
            replyTo: email,
            subject: `[Contact] ${subject}`,
            html: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 24px; border-radius: 12px 12px 0 0;">
                        <h2 style="color: white; margin: 0;">📬 ข้อความจากหน้าติดต่อ</h2>
                    </div>
                    <div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">ชื่อ:</td>
                                <td style="padding: 8px 0; font-weight: 600; color: #1e293b;">${escapeHtml(name)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">อีเมล:</td>
                                <td style="padding: 8px 0; font-weight: 600; color: #1e293b;">
                                    <a href="mailto:${escapeHtml(email)}" style="color: #2563eb;">${escapeHtml(email)}</a>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">หัวข้อ:</td>
                                <td style="padding: 8px 0; font-weight: 600; color: #1e293b;">${escapeHtml(subject)}</td>
                            </tr>
                        </table>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
                        <div style="color: #374151; line-height: 1.7; white-space: pre-wrap;">${escapeHtml(message)}</div>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
                        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                            IP: ${clientIP} | Sent at: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
                        </p>
                    </div>
                </div>
            `,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Contact form error:', error);
        return NextResponse.json(
            { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
            { status: 500 }
        );
    }
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

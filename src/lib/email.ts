import nodemailer from 'nodemailer';
import { Resend } from 'resend';

// =====================
// EMAIL PROVIDER (Resend for production, nodemailer for local)
// =====================
let _resend: Resend | null = null;
let _transporter: nodemailer.Transporter | null = null;

function getResend(): Resend | null {
    if (!process.env.RESEND_API_KEY) return null;
    if (!_resend) {
        _resend = new Resend(process.env.RESEND_API_KEY);
    }
    return _resend;
}

function getTransporter(): nodemailer.Transporter | null {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
    if (!_transporter) {
        _transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    return _transporter;
}

const EMAIL_FROM = process.env.SMTP_FROM || 'MilerDev <noreply@milerdev.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://milerdev.com';
const LOGO_URL = process.env.SMTP_LOGO_URL || `${APP_URL}/milerdev-logo-transparent.png`;
const BRAND_COLOR = '#2563eb';

// =====================
// BASE EMAIL LAYOUT
// =====================
function emailLayout(content: string): string {
    return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <!-- Header -->
    <div style="background:${BRAND_COLOR};border-radius:16px 16px 0 0;padding:32px 24px;text-align:center;">
      <img src="${LOGO_URL}" alt="MilerDev" width="48" height="48" style="border-radius:12px;background:white;padding:6px;" />
      <h1 style="color:white;font-size:1.25rem;margin:12px 0 0;font-weight:600;">MilerDev</h1>
    </div>
    <!-- Body -->
    <div style="background:white;padding:32px 24px;border-radius:0 0 16px 16px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
      ${content}
    </div>
    <!-- Footer -->
    <div style="text-align:center;padding:24px 16px;color:#94a3b8;font-size:0.75rem;">
      <p style="margin:0 0 4px;">&copy; ${new Date().getFullYear()} MilerDev. All rights reserved.</p>
      <p style="margin:0;">
        <a href="${APP_URL}" style="color:#64748b;text-decoration:none;">milerdev.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function button(text: string, url: string, color: string = BRAND_COLOR): string {
    return `<a href="${url}" style="display:inline-block;padding:14px 28px;background:${color};color:white;text-decoration:none;border-radius:10px;font-weight:600;font-size:0.9375rem;margin:8px 0;">${text}</a>`;
}

function infoBox(rows: { label: string; value: string }[]): string {
    const items = rows.map(r => `<tr><td style="padding:8px 12px;color:#64748b;font-size:0.875rem;border-bottom:1px solid #f1f5f9;">${r.label}</td><td style="padding:8px 12px;font-weight:600;color:#1e293b;font-size:0.875rem;border-bottom:1px solid #f1f5f9;">${r.value}</td></tr>`).join('');
    return `<table style="width:100%;background:#f8fafc;border-radius:12px;border-collapse:collapse;margin:20px 0;">${items}</table>`;
}

// =====================
// SEND EMAIL HELPER
// =====================
async function sendEmail(to: string, subject: string, html: string) {
    try {
        // Try Resend first (HTTP API — works on Railway)
        const resend = getResend();
        if (resend) {
            await resend.emails.send({
                from: EMAIL_FROM,
                to,
                subject,
                html,
            });
            console.log('[Email/Resend] Sent to:', to, '| Subject:', subject);
            return;
        }

        // Fallback to nodemailer (local dev)
        const transporter = getTransporter();
        if (!transporter) {
            console.warn('[Email] No email provider configured, skipping email to:', to);
            return;
        }
        await transporter.sendMail({
            from: EMAIL_FROM,
            to,
            subject,
            html,
        });
        console.log('[Email/SMTP] Sent to:', to, '| Subject:', subject);
    } catch (error) {
        console.error('[Email] Failed to send to:', to, error);
    }
}

// =====================
// INTERFACES
// =====================
interface SendWelcomeEmailParams {
    email: string;
    name: string;
}

interface SendEnrollmentEmailParams {
    email: string;
    name: string;
    courseName: string;
    courseSlug: string;
}

interface SendPaymentConfirmationParams {
    email: string;
    name: string;
    courseName: string;
    amount: number;
    paymentId: string;
}

interface SendPasswordResetEmailParams {
    email: string;
    name: string | null;
    resetToken: string;
}

interface SendCertificateEmailParams {
    email: string;
    name: string;
    courseName: string;
    certificateCode: string;
}

// =====================
// EMAIL FUNCTIONS
// =====================

/**
 * Send welcome email after registration
 */
export async function sendWelcomeEmail({ email, name }: SendWelcomeEmailParams) {
    const html = emailLayout(`
      <h2 style="color:#1e293b;font-size:1.375rem;margin:0 0 8px;">สวัสดีครับ ${name}!</h2>
      <p style="color:#475569;line-height:1.7;margin:0 0 16px;">
        ขอบคุณที่สมัครสมาชิกกับ <strong>MilerDev</strong> เรายินดีต้อนรับคุณเข้าสู่ชุมชนนักพัฒนา
      </p>
      <p style="color:#475569;line-height:1.7;margin:0 0 24px;">
        คุณสามารถเริ่มเรียนคอร์สต่างๆ ได้เลยวันนี้ ไม่ว่าจะเป็น Web Development, Backend, หรือ DevOps
      </p>
      <div style="text-align:center;margin:24px 0;">
        ${button('ดูคอร์สทั้งหมด', `${APP_URL}/courses`)}
      </div>
      <div style="border-top:1px solid #e2e8f0;padding-top:16px;margin-top:24px;">
        <p style="color:#94a3b8;font-size:0.8125rem;margin:0;">หากมีคำถามหรือข้อสงสัยใดๆ สามารถติดต่อเราได้ตลอดเวลา</p>
      </div>
    `);
    await sendEmail(email, 'ยินดีต้อนรับสู่ MilerDev!', html);
}

/**
 * Send enrollment confirmation email
 */
export async function sendEnrollmentEmail({
    email,
    name,
    courseName,
    courseSlug,
}: SendEnrollmentEmailParams) {
    const html = emailLayout(`
      <h2 style="color:#1e293b;font-size:1.375rem;margin:0 0 8px;">ลงทะเบียนเรียบร้อย!</h2>
      <p style="color:#475569;line-height:1.7;margin:0 0 16px;">
        สวัสดีครับ ${name}, คุณได้ลงทะเบียนเรียนคอร์สเรียบร้อยแล้ว
      </p>
      ${infoBox([
        { label: 'คอร์ส', value: courseName },
        { label: 'สถานะ', value: '<span style="color:#10b981;">พร้อมเรียน</span>' },
      ])}
      <div style="text-align:center;margin:24px 0;">
        ${button('เริ่มเรียนเลย', `${APP_URL}/courses/${courseSlug}/learn`, '#10b981')}
      </div>
      <p style="color:#94a3b8;font-size:0.8125rem;margin:16px 0 0;">
        คุณสามารถเข้าเรียนได้ตลอดเวลาจากหน้า Dashboard ของคุณ
      </p>
    `);
    await sendEmail(email, `ลงทะเบียนคอร์ส: ${courseName}`, html);
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail({
    email,
    name,
    resetToken,
}: SendPasswordResetEmailParams) {
    const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;
    const html = emailLayout(`
      <h2 style="color:#1e293b;font-size:1.375rem;margin:0 0 8px;">รีเซ็ตรหัสผ่าน</h2>
      <p style="color:#475569;line-height:1.7;margin:0 0 16px;">
        สวัสดีครับ ${name || 'คุณ'}, เราได้รับคำขอรีเซ็ตรหัสผ่านของคุณ
      </p>
      <p style="color:#475569;line-height:1.7;margin:0 0 24px;">
        คลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่ ลิงก์นี้จะหมดอายุใน <strong>1 ชั่วโมง</strong>
      </p>
      <div style="text-align:center;margin:24px 0;">
        ${button('ตั้งรหัสผ่านใหม่', resetUrl, '#dc2626')}
      </div>
      <div style="background:#fef2f2;border-radius:8px;padding:12px 16px;margin-top:20px;">
        <p style="color:#991b1b;font-size:0.8125rem;margin:0;">
          หากคุณไม่ได้ร้องขอการรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยอีเมลนี้ รหัสผ่านของคุณจะไม่ถูกเปลี่ยน
        </p>
      </div>
    `);
    await sendEmail(email, 'รีเซ็ตรหัสผ่าน - MilerDev', html);
}

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmation({
    email,
    name,
    courseName,
    amount,
    paymentId,
}: SendPaymentConfirmationParams) {
    const html = emailLayout(`
      <h2 style="color:#1e293b;font-size:1.375rem;margin:0 0 8px;">ชำระเงินสำเร็จ!</h2>
      <p style="color:#475569;line-height:1.7;margin:0 0 16px;">
        สวัสดีครับ ${name}, เราได้รับการชำระเงินของคุณเรียบร้อยแล้ว
      </p>
      ${infoBox([
        { label: 'คอร์ส', value: courseName },
        { label: 'จำนวนเงิน', value: `฿${amount.toLocaleString()}` },
        { label: 'หมายเลขอ้างอิง', value: paymentId },
        { label: 'สถานะ', value: '<span style="color:#10b981;">ชำระแล้ว</span>' },
      ])}
      <div style="text-align:center;margin:24px 0;">
        ${button('ไปยังคอร์สของฉัน', `${APP_URL}/dashboard`)}
      </div>
      <p style="color:#94a3b8;font-size:0.8125rem;margin:16px 0 0;">
        อีเมลนี้เป็นหลักฐานการชำระเงิน กรุณาเก็บไว้เป็นหลักฐาน
      </p>
    `);
    await sendEmail(email, `ยืนยันการชำระเงิน - ${courseName}`, html);
}

/**
 * Send certificate issued email
 */
export async function sendCertificateEmail({
    email,
    name,
    courseName,
    certificateCode,
}: SendCertificateEmailParams) {
    const certUrl = `${APP_URL}/certificate/${certificateCode}`;
    const html = emailLayout(`
      <h2 style="color:#1e293b;font-size:1.375rem;margin:0 0 8px;">ยินดีด้วย! คุณได้รับใบรับรอง</h2>
      <p style="color:#475569;line-height:1.7;margin:0 0 16px;">
        สวัสดีครับ ${name}, คุณได้สำเร็จหลักสูตรเรียบร้อยแล้ว!
      </p>
      ${infoBox([
        { label: 'คอร์ส', value: courseName },
        { label: 'รหัสใบรับรอง', value: `<span style="font-family:monospace;color:${BRAND_COLOR};font-weight:700;">${certificateCode}</span>` },
        { label: 'สถานะ', value: '<span style="color:#10b981;">ออกใบรับรองแล้ว</span>' },
      ])}
      <div style="text-align:center;margin:24px 0;">
        ${button('ดูใบรับรองของคุณ', certUrl, '#7c3aed')}
      </div>
      <p style="color:#94a3b8;font-size:0.8125rem;margin:16px 0 0;">
        คุณสามารถดาวน์โหลดใบรับรองเป็นรูปภาพ หรือแชร์ลิงก์ให้ผู้อื่นตรวจสอบได้
      </p>
    `);
    await sendEmail(email, `ใบรับรองสำเร็จหลักสูตร: ${courseName}`, html);
}

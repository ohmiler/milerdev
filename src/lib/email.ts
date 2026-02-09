import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
    if (!_resend) {
        _resend = new Resend(process.env.RESEND_API_KEY);
    }
    return _resend;
}

// Email sender configuration
const EMAIL_FROM = process.env.EMAIL_FROM || "MilerDev <noreply@milerdev.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://milerdev.com";

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

/**
 * Send welcome email after registration
 */
export async function sendWelcomeEmail({ email, name }: SendWelcomeEmailParams) {
    await getResend().emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: "ยินดีต้อนรับสู่ MilerDev! ",
        html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>สวัสดี ${name}!</h1>
        <p>ขอบคุณที่สมัครสมาชิกกับเรา</p>
        <p>คุณสามารถเริ่มเรียนคอร์สต่างๆ ได้เลยวันนี้</p>
        <a href="${APP_URL}/courses" 
           style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">
          ดูคอร์สทั้งหมด
        </a>
      </div>
    `,
    });
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
    await getResend().emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: `คุณได้ลงทะเบียนคอร์ส: ${courseName}`,
        html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>ยินดีด้วย ${name}! 🎓</h1>
        <p>คุณได้ลงทะเบียนเรียนคอร์ส <strong>${courseName}</strong> เรียบร้อยแล้ว</p>
        <p>คุณสามารถเริ่มเรียนได้ทันที</p>
        <a href="${APP_URL}/courses/${courseSlug}/learn" 
           style="display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 8px;">
          เริ่มเรียนเลย
        </a>
      </div>
    `,
    });
}

interface SendPasswordResetEmailParams {
    email: string;
    name: string | null;
    resetToken: string;
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
    await getResend().emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: "รีเซ็ตรหัสผ่าน - MilerDev",
        html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>รีเซ็ตรหัสผ่าน</h1>
        <p>สวัสดี ${name || 'คุณ'},</p>
        <p>เราได้รับคำขอรีเซ็ตรหัสผ่านของคุณ คลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่</p>
        <a href="${resetUrl}" 
           style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">
          ตั้งรหัสผ่านใหม่
        </a>
        <p style="margin-top: 16px; color: #64748b; font-size: 0.875rem;">ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง หากคุณไม่ได้ร้องขอ กรุณาเพิกเฉยอีเมลนี้</p>
      </div>
    `,
    });
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
    await getResend().emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: `ยืนยันการชำระเงิน - ${courseName}`,
        html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>ขอบคุณสำหรับการสั่งซื้อ! 💳</h1>
        <p>สวัสดี ${name},</p>
        <p>เราได้รับการชำระเงินของคุณเรียบร้อยแล้ว</p>
        
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>คอร์ส:</strong> ${courseName}</p>
          <p><strong>จำนวนเงิน:</strong> ฿${amount.toLocaleString()}</p>
          <p><strong>หมายเลขการชำระเงิน:</strong> ${paymentId}</p>
        </div>
        
        <a href="${APP_URL}/dashboard" 
           style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">
          ไปยังคอร์สของฉัน
        </a>
      </div>
    `,
    });
}

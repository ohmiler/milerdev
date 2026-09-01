import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getClientIP, rateLimits, rateLimitResponse } from '@/lib/rate-limit';
import {
    authRateLimitUnavailableResponse,
    consumeAuthRateLimit,
} from '@/lib/auth-rate-limit';
import { sendWelcomeEmail } from '@/lib/email';
import {
  PASSWORD_LOWERCASE_PATTERN,
  PASSWORD_MIN_LENGTH,
  PASSWORD_NUMBER_PATTERN,
  PASSWORD_UPPERCASE_PATTERN,
} from '@/lib/password-policy';

// Validation schema
const registerSchema = z.object({
    name: z.string().min(2, 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร').max(100),
    email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
    password: z
        .string()
        .min(PASSWORD_MIN_LENGTH, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
        .regex(PASSWORD_UPPERCASE_PATTERN, 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว')
        .regex(PASSWORD_LOWERCASE_PATTERN, 'รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว')
        .regex(PASSWORD_NUMBER_PATTERN, 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว'),
});

export async function POST(request: Request) {
  try {
    const genericRegisterMessage = 'ตรวจสอบคำขอแล้ว';

    // Rate limiting - 5 requests per minute per IP
    const clientIP = getClientIP(request);
    const rateLimit = await consumeAuthRateLimit({
      namespace: 'register',
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
    
    // Validate input
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    
    const { name, password } = validation.data;
    const email = validation.data.email.toLowerCase().trim();

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      // Return generic message to prevent email enumeration
      return NextResponse.json(
        { message: genericRegisterMessage },
        { status: 200 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    await db.insert(users).values({
      name,
      email,
      passwordHash,
      role: 'student',
    });

    // Send welcome email (non-blocking)
    sendWelcomeEmail({ email, name }).catch((err) =>
      console.error('Failed to send welcome email:', err)
    );

    return NextResponse.json(
      { message: genericRegisterMessage },
      { status: 200 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
      { status: 500 }
    );
  }
}


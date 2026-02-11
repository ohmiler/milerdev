import { db } from '@/lib/db';
import { certificates, courses, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { sendCertificateEmail } from '@/lib/email';

/**
 * Generate a unique certificate code like "CERT-XXXX-XXXX"
 */
function generateCertificateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'CERT-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += '-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Issue a certificate for a user who completed a course.
 * Returns the certificate if created, or existing certificate if already issued.
 */
export async function issueCertificate(userId: string, courseId: string): Promise<{
  certificate: typeof certificates.$inferSelect;
  isNew: boolean;
}> {
  // Check if certificate already exists
  const [existing] = await db
    .select()
    .from(certificates)
    .where(
      and(
        eq(certificates.userId, userId),
        eq(certificates.courseId, courseId)
      )
    )
    .limit(1);

  if (existing) {
    return { certificate: existing, isNew: false };
  }

  // Get user and course info
  const [[user], [course]] = await Promise.all([
    db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId)).limit(1),
    db.select({ title: courses.title, certificateColor: courses.certificateColor, certificateHeaderImage: courses.certificateHeaderImage }).from(courses).where(eq(courses.id, courseId)).limit(1),
  ]);

  if (!user || !course) {
    throw new Error('User or course not found');
  }

  // Generate unique code (retry if collision)
  let certificateCode = generateCertificateCode();
  let retries = 0;
  while (retries < 5) {
    const [exists] = await db
      .select({ id: certificates.id })
      .from(certificates)
      .where(eq(certificates.certificateCode, certificateCode))
      .limit(1);
    if (!exists) break;
    certificateCode = generateCertificateCode();
    retries++;
  }

  const id = createId();
  const now = new Date();

  await db.insert(certificates).values({
    id,
    userId,
    courseId,
    certificateCode,
    recipientName: user.name || 'ผู้เรียน',
    courseTitle: course.title,
    completedAt: now,
    issuedAt: now,
    certificateTheme: course.certificateColor || '#2563eb',
    certificateHeaderImage: course.certificateHeaderImage || null,
  });

  const [certificate] = await db
    .select()
    .from(certificates)
    .where(eq(certificates.id, id))
    .limit(1);

  // Send certificate email (non-blocking)
  if (user.email) {
    sendCertificateEmail({
      email: user.email,
      name: user.name || 'ผู้เรียน',
      courseName: course.title,
      certificateCode,
    }).catch((err) => console.error('Failed to send certificate email:', err));
  }

  return { certificate, isNew: true };
}

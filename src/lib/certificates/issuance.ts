import 'server-only';

import { createId } from '@paralleldrive/cuid2';
import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { certificates, courses, enrollments, users } from '@/lib/db/schema';
import { isDuplicateKeyError } from '@/lib/db/safe-insert';
import { sendCertificateEmail } from '@/lib/email';
import { logError } from '@/lib/error-handler';
import { notify } from '@/lib/notify';

type CertificateRecord = typeof certificates.$inferSelect;
type IssuanceAuthority = 'explicit_admin_intent' | 'verified_completion';

type IssuanceOutcome =
  | { kind: 'not_completed' }
  | {
    kind: 'ready' | 'revoked';
    certificate: CertificateRecord;
    isNew: false;
  }
  | {
    kind: 'issued';
    certificate: CertificateRecord;
    isNew: true;
    delivery: {
      email: string | null;
      name: string | null;
      courseTitle: string;
    };
  };

export type CompletedCertificateResult =
  | { kind: 'ready' | 'issued' | 'revoked'; code: string }
  | { kind: 'not_completed' };

const MAX_CODE_ATTEMPTS = 5;

function generateCertificateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'CERT-';
  for (let index = 0; index < 4; index++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += '-';
  for (let index = 0; index < 4; index++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function issueCertificateWithAuthority(
  userId: string,
  courseId: string,
  authority: IssuanceAuthority,
): Promise<IssuanceOutcome> {
  const outcome = await db.transaction(async (tx): Promise<IssuanceOutcome> => {
    const [user] = await tx
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .for('update');
    if (!user) throw new Error('Certificate subject not found');

    const [existing] = await tx
      .select()
      .from(certificates)
      .where(and(
        eq(certificates.userId, userId),
        eq(certificates.courseId, courseId),
      ))
      .orderBy(asc(certificates.revokedAt))
      .limit(1);
    if (existing) {
      return {
        kind: existing.revokedAt ? 'revoked' : 'ready',
        certificate: existing,
        isNew: false,
      };
    }

    let completedAt = new Date();
    if (authority === 'verified_completion') {
      const [enrollment] = await tx
        .select({ completedAt: enrollments.completedAt })
        .from(enrollments)
        .where(and(
          eq(enrollments.userId, userId),
          eq(enrollments.courseId, courseId),
        ))
        .limit(1)
        .for('update');
      if (!enrollment?.completedAt) return { kind: 'not_completed' };
      completedAt = enrollment.completedAt;
    }

    const [course] = await tx
      .select({
        title: courses.title,
        certificateColor: courses.certificateColor,
        certificateHeaderImage: courses.certificateHeaderImage,
      })
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);
    if (!course) throw new Error('Certificate course not found');

    const id = createId();
    const issuedAt = new Date();
    let certificateCode = '';
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      certificateCode = generateCertificateCode();
      try {
        await tx.insert(certificates).values({
          id,
          userId,
          courseId,
          certificateCode,
          recipientName: user.name || 'ผู้เรียน',
          courseTitle: course.title,
          completedAt,
          issuedAt,
          certificateTheme: course.certificateColor || '#2563eb',
          certificateHeaderImage: course.certificateHeaderImage || null,
        });
        break;
      } catch (error) {
        if (!isDuplicateKeyError(error) || attempt === MAX_CODE_ATTEMPTS - 1) {
          throw error;
        }
      }
    }

    const [certificate] = await tx
      .select()
      .from(certificates)
      .where(eq(certificates.id, id))
      .limit(1);
    if (!certificate) throw new Error('Certificate insert was not readable');

    return {
      kind: 'issued',
      certificate,
      isNew: true,
      delivery: {
        email: user.email,
        name: user.name,
        courseTitle: course.title,
      },
    };
  });

  if (outcome.kind === 'issued') {
    const { certificate, delivery } = outcome;
    if (delivery.email) {
      void sendCertificateEmail({
        email: delivery.email,
        name: delivery.name || 'ผู้เรียน',
        courseName: delivery.courseTitle,
        certificateCode: certificate.certificateCode,
      }).catch((error) => logError(
        error instanceof Error ? error : new Error(String(error)),
        { action: 'certificate.email.failed' },
      ));
    }

    void notify({
      userId,
      title: '🎓 ยินดีด้วย! คุณได้รับใบรับรอง',
      message: `สำเร็จหลักสูตร "${delivery.courseTitle}"`,
      type: 'success',
      link: `/certificate/${certificate.certificateCode}`,
    }).catch((error) => logError(
      error instanceof Error ? error : new Error(String(error)),
      { action: 'certificate.notification.failed' },
    ));
  }

  return outcome;
}

export async function issueCertificate(userId: string, courseId: string): Promise<{
  certificate: CertificateRecord;
  isNew: boolean;
}> {
  const outcome = await issueCertificateWithAuthority(userId, courseId, 'explicit_admin_intent');
  if (outcome.kind === 'not_completed') {
    throw new Error('Unexpected completion requirement for admin certificate issuance');
  }
  return { certificate: outcome.certificate, isNew: outcome.isNew };
}

export async function ensureCompletedCertificate(
  userId: string,
  courseId: string,
): Promise<CompletedCertificateResult> {
  const outcome = await issueCertificateWithAuthority(userId, courseId, 'verified_completion');
  if (outcome.kind === 'not_completed') return outcome;
  return {
    kind: outcome.kind,
    code: outcome.certificate.certificateCode,
  };
}

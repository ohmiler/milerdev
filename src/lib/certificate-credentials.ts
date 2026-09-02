import 'server-only';

import { and, asc, eq } from 'drizzle-orm';

import { ensureCompletedCertificate } from '@/lib/certificate';
import { db } from '@/lib/db';
import { certificates, courses, enrollments } from '@/lib/db/schema';
import { logError } from '@/lib/error-handler';

type OwnerEnrollmentFact = {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  enrolledAt: Date | null;
  completedAt: Date | null;
};

type OwnerCertificateFact = {
  courseId: string;
  certificateCode: string;
  recipientName: string;
  courseTitle: string;
  courseSlug: string;
  completedAt: Date;
  issuedAt: Date | null;
  revokedAt: Date | null;
};

type PublicCertificateFact = Omit<OwnerCertificateFact, 'courseId'> & {
  certificateTheme: string | null;
  certificateHeaderImage: string | null;
};

export type CertificateProjectionStore = {
  readOwner(memberId: string): Promise<{
    enrollments: OwnerEnrollmentFact[];
    certificates: OwnerCertificateFact[];
  }>;
  readPublic(code: string): Promise<PublicCertificateFact | null>;
};

type OwnerCertificateItem =
  | {
    kind: 'active' | 'revoked';
    code: string;
    recipientName: string;
    courseTitle: string;
    courseSlug: string;
    completedAt: string;
    issuedAt: string | null;
  }
  | {
    kind: 'missing';
    courseTitle: string;
    courseSlug: string;
    completedAt: string;
  };

export type PublicCertificateVerification =
  | { kind: 'not_found' }
  | {
    kind: 'active' | 'revoked';
    credential: {
      code: string;
      recipientName: string;
      courseTitle: string;
      courseSlug: string | null;
      completedAt: string;
      issuedAt: string | null;
      revokedAt: string | null;
      certificateTheme: string | null;
      certificateHeaderImage: string | null;
    };
  };

export type OwnerCertificateCollection = {
  summary: {
    activeCount: number;
    revokedCount: number;
    missingCount: number;
    hasEnrollment: boolean;
  };
  items: OwnerCertificateItem[];
};

export type CertificateRecoveryResult =
  | { kind: 'ready' | 'issued' | 'revoked'; code: string }
  | { kind: 'not_completed' | 'temporarily_unavailable' };

export type CertificateRepairAdapter = {
  read(memberId: string, courseSlug: string): Promise<{
    courseId: string;
    completedAt: Date | null;
    certificate: { code: string; revokedAt: Date | null } | null;
  } | null>;
  ensureCompleted(memberId: string, courseId: string): Promise<CertificateRecoveryResult>;
};

const databaseProjectionStore: CertificateProjectionStore = {
  async readOwner(memberId) {
    const [enrollmentRows, certificateRows] = await Promise.all([
      db
        .select({
          courseId: courses.id,
          courseTitle: courses.title,
          courseSlug: courses.slug,
          enrolledAt: enrollments.enrolledAt,
          completedAt: enrollments.completedAt,
        })
        .from(enrollments)
        .innerJoin(courses, eq(enrollments.courseId, courses.id))
        .where(eq(enrollments.userId, memberId)),
      db
        .select({
          courseId: certificates.courseId,
          certificateCode: certificates.certificateCode,
          recipientName: certificates.recipientName,
          courseTitle: certificates.courseTitle,
          courseSlug: courses.slug,
          completedAt: certificates.completedAt,
          issuedAt: certificates.issuedAt,
          revokedAt: certificates.revokedAt,
        })
        .from(certificates)
        .innerJoin(courses, eq(certificates.courseId, courses.id))
        .where(eq(certificates.userId, memberId)),
    ]);
    return { enrollments: enrollmentRows, certificates: certificateRows };
  },

  async readPublic(code) {
    const [certificate] = await db
      .select({
        certificateCode: certificates.certificateCode,
        recipientName: certificates.recipientName,
        courseTitle: certificates.courseTitle,
        courseSlug: courses.slug,
        completedAt: certificates.completedAt,
        issuedAt: certificates.issuedAt,
        revokedAt: certificates.revokedAt,
        certificateTheme: certificates.certificateTheme,
        certificateHeaderImage: certificates.certificateHeaderImage,
      })
      .from(certificates)
      .innerJoin(courses, eq(certificates.courseId, courses.id))
      .where(eq(certificates.certificateCode, code))
      .limit(1);
    return certificate ?? null;
  },
};

const databaseRepairAdapter: CertificateRepairAdapter = {
  async read(memberId, courseSlug) {
    const [enrollment] = await db
      .select({
        courseId: courses.id,
        completedAt: enrollments.completedAt,
      })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(and(
        eq(enrollments.userId, memberId),
        eq(courses.slug, courseSlug),
      ))
      .limit(1);
    if (!enrollment) return null;

    const [certificate] = await db
      .select({
        code: certificates.certificateCode,
        revokedAt: certificates.revokedAt,
      })
      .from(certificates)
      .where(and(
        eq(certificates.userId, memberId),
        eq(certificates.courseId, enrollment.courseId),
      ))
      .orderBy(asc(certificates.revokedAt))
      .limit(1);
    return {
      ...enrollment,
      certificate: certificate ?? null,
    };
  },

  ensureCompleted: ensureCompletedCertificate,
};

function timestamp(value: Date | null) {
  return value?.getTime() ?? 0;
}

export async function getOwnerCertificateCollection(
  memberId: string,
  store: CertificateProjectionStore = databaseProjectionStore,
): Promise<OwnerCertificateCollection> {
  const ownerFacts = await store.readOwner(memberId);
  const certificateCourseIds = new Set(
    ownerFacts.certificates.map((certificate) => certificate.courseId),
  );
  const credentials: OwnerCertificateItem[] = [...ownerFacts.certificates]
    .sort((left, right) => (
      (left.revokedAt ? 1 : 0) - (right.revokedAt ? 1 : 0)
      || timestamp(right.issuedAt) - timestamp(left.issuedAt)
    ))
    .map((certificate) => ({
      kind: certificate.revokedAt ? 'revoked' as const : 'active' as const,
      code: certificate.certificateCode,
      recipientName: certificate.recipientName,
      courseTitle: certificate.courseTitle,
      courseSlug: certificate.courseSlug,
      completedAt: certificate.completedAt.toISOString(),
      issuedAt: certificate.issuedAt?.toISOString() ?? null,
    }));
  const missing: OwnerCertificateItem[] = ownerFacts.enrollments
    .filter((enrollment) => (
      enrollment.completedAt
      && !certificateCourseIds.has(enrollment.courseId)
    ))
    .sort((left, right) => timestamp(right.completedAt) - timestamp(left.completedAt))
    .map((enrollment) => ({
      kind: 'missing',
      courseTitle: enrollment.courseTitle,
      courseSlug: enrollment.courseSlug,
      completedAt: enrollment.completedAt!.toISOString(),
    }));

  return {
    summary: {
      activeCount: credentials.filter((item) => item.kind === 'active').length,
      revokedCount: credentials.filter((item) => item.kind === 'revoked').length,
      missingCount: missing.length,
      hasEnrollment: ownerFacts.enrollments.length > 0,
    },
    items: [...credentials, ...missing],
  };
}

export async function getPublicCertificateVerification(
  code: string,
  store: CertificateProjectionStore = databaseProjectionStore,
): Promise<PublicCertificateVerification> {
  const certificate = await store.readPublic(code);
  if (!certificate) return { kind: 'not_found' };

  return {
    kind: certificate.revokedAt ? 'revoked' : 'active',
    credential: {
      code: certificate.certificateCode,
      recipientName: certificate.recipientName,
      courseTitle: certificate.courseTitle,
      courseSlug: certificate.courseSlug || null,
      completedAt: certificate.completedAt.toISOString(),
      issuedAt: certificate.issuedAt?.toISOString() ?? null,
      revokedAt: certificate.revokedAt?.toISOString() ?? null,
      certificateTheme: certificate.certificateTheme ?? null,
      certificateHeaderImage: certificate.certificateHeaderImage ?? null,
    },
  };
}

export async function repairOwnerCertificate(
  memberId: string,
  courseSlug: string,
  adapter: CertificateRepairAdapter = databaseRepairAdapter,
): Promise<CertificateRecoveryResult> {
  try {
    const recoveryState = await adapter.read(memberId, courseSlug);
    if (!recoveryState?.completedAt) return { kind: 'not_completed' };
    if (recoveryState.certificate) {
      return {
        kind: recoveryState.certificate.revokedAt ? 'revoked' : 'ready',
        code: recoveryState.certificate.code,
      };
    }

    return await adapter.ensureCompleted(memberId, recoveryState.courseId);
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      action: 'certificate.repair.failed',
    });
    return { kind: 'temporarily_unavailable' };
  }
}

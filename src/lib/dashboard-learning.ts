import 'server-only';

import { and, count, eq, inArray, isNull } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  certificates,
  courses,
  enrollments,
  lessonProgress,
  lessons,
  payments,
} from '@/lib/db/schema';
import {
  deriveLearningPresentation,
  type LearningPresentation,
  type LearningPresentationSource,
} from '@/lib/learning-presentation';
import { sortCoursesByLearningActivity } from '@/lib/learning-continuation';

type DashboardLearningRead = {
  enrollments: LearningPresentationSource[];
  activeCertificateCount: number;
  paymentCount: number;
};

export type DashboardLearningStore = {
  read(memberId: string): Promise<DashboardLearningRead>;
};

export type DashboardLearning = {
  summary: {
    courseCount: number;
    activeCourseCount: number;
    completedCourseCount: number;
    activeCertificateCount: number;
    paymentCount: number;
  };
  primary: LearningPresentation;
  remaining: LearningPresentation[];
};

const databaseDashboardLearningStore: DashboardLearningStore = {
  async read(memberId) {
    const [enrollmentRows, [certificateCount], [paymentCount]] = await Promise.all([
      db
        .select({
          courseId: courses.id,
          courseTitle: courses.title,
          courseSlug: courses.slug,
          courseThumbnailUrl: courses.thumbnailUrl,
          enrolledAt: enrollments.enrolledAt,
          completedAt: enrollments.completedAt,
        })
        .from(enrollments)
        .innerJoin(courses, eq(enrollments.courseId, courses.id))
        .where(eq(enrollments.userId, memberId)),
      db
        .select({ count: count() })
        .from(certificates)
        .where(and(
          eq(certificates.userId, memberId),
          isNull(certificates.revokedAt),
        )),
      db
        .select({ count: count() })
        .from(payments)
        .where(eq(payments.userId, memberId)),
    ]);

    if (enrollmentRows.length === 0) {
      return {
        enrollments: [],
        activeCertificateCount: certificateCount?.count ?? 0,
        paymentCount: paymentCount?.count ?? 0,
      };
    }

    const courseIds = enrollmentRows.map((row) => row.courseId);
    const [lessonRows, progressRows, certificateRows] = await Promise.all([
      db
        .select({
          id: lessons.id,
          courseId: lessons.courseId,
          title: lessons.title,
          orderIndex: lessons.orderIndex,
        })
        .from(lessons)
        .where(inArray(lessons.courseId, courseIds)),
      db
        .select({
          courseId: lessons.courseId,
          lessonId: lessonProgress.lessonId,
          completed: lessonProgress.completed,
          watchTimeSeconds: lessonProgress.watchTimeSeconds,
          lastWatchedAt: lessonProgress.lastWatchedAt,
        })
        .from(lessonProgress)
        .innerJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
        .where(and(
          eq(lessonProgress.userId, memberId),
          inArray(lessons.courseId, courseIds),
        )),
      db
        .select({
          courseId: certificates.courseId,
          revokedAt: certificates.revokedAt,
        })
        .from(certificates)
        .where(and(
          eq(certificates.userId, memberId),
          inArray(certificates.courseId, courseIds),
        )),
    ]);

    const lessonsByCourse = new Map<string, typeof lessonRows>();
    for (const lesson of lessonRows) {
      const courseLessons = lessonsByCourse.get(lesson.courseId) ?? [];
      courseLessons.push(lesson);
      lessonsByCourse.set(lesson.courseId, courseLessons);
    }

    const progressByCourse = new Map<string, typeof progressRows>();
    for (const progress of progressRows) {
      const courseProgress = progressByCourse.get(progress.courseId) ?? [];
      courseProgress.push(progress);
      progressByCourse.set(progress.courseId, courseProgress);
    }

    const certificateByCourse = new Map<string, (typeof certificateRows)[number]>();
    for (const certificate of certificateRows) {
      const current = certificateByCourse.get(certificate.courseId);
      if (!current || (current.revokedAt && !certificate.revokedAt)) {
        certificateByCourse.set(certificate.courseId, certificate);
      }
    }

    return {
      enrollments: enrollmentRows.map((row) => ({
        course: {
          id: row.courseId,
          title: row.courseTitle,
          slug: row.courseSlug,
          thumbnailUrl: row.courseThumbnailUrl,
        },
        enrollment: {
          enrolledAt: row.enrolledAt,
          completedAt: row.completedAt,
        },
        lessons: lessonsByCourse.get(row.courseId) ?? [],
        progress: progressByCourse.get(row.courseId) ?? [],
        certificate: certificateByCourse.get(row.courseId) ?? null,
      })),
      activeCertificateCount: certificateCount?.count ?? 0,
      paymentCount: paymentCount?.count ?? 0,
    };
  },
};

export async function getDashboardLearning(
  memberId: string,
  store: DashboardLearningStore = databaseDashboardLearningStore,
): Promise<DashboardLearning> {
  const source = await store.read(memberId);
  const orderedSources = sortCoursesByLearningActivity(
    source.enrollments.map((enrollment) => ({
      enrollment,
      enrolledAt: enrollment.enrollment.enrolledAt,
      progress: enrollment.progress,
    })),
  ).map(({ enrollment }) => enrollment);
  const presentations = orderedSources.map(deriveLearningPresentation);
  const primaryIndex = presentations.findIndex((item) => item.enrollment === 'active');
  const selectedIndex = primaryIndex >= 0 ? primaryIndex : presentations.length > 0 ? 0 : -1;
  const primary = selectedIndex >= 0
    ? presentations[selectedIndex]
    : deriveLearningPresentation(null);
  const remaining = selectedIndex >= 0
    ? presentations.filter((_, index) => index !== selectedIndex)
    : [];

  return {
    summary: {
      courseCount: presentations.length,
      activeCourseCount: presentations.filter((item) => item.enrollment === 'active').length,
      completedCourseCount: presentations.filter((item) => item.enrollment === 'completed').length,
      activeCertificateCount: source.activeCertificateCount,
      paymentCount: source.paymentCount,
    },
    primary,
    remaining,
  };
}

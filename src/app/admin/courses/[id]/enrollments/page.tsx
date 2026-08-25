import { db } from '@/lib/db';
import { courses, enrollments, users, lessonProgress, lessons } from '@/lib/db/schema';
import { eq, sql, desc, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import {
  CourseEnrollmentsView,
  normalizeCourseEnrollmentPage,
} from '@/components/admin/CourseEnrollmentsView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}

async function getCourseWithEnrollments(courseId: string, page: number) {
  const perPage = 25;

  const [course] = await db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
    })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);

  if (!course) return null;

  const [lessonCountResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(lessons)
    .where(eq(lessons.courseId, courseId));
  const totalLessons = lessonCountResult?.count || 0;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(enrollments)
    .where(eq(enrollments.courseId, courseId));
  const totalEnrollments = countResult?.count || 0;
  const totalPages = Math.ceil(totalEnrollments / perPage);
  const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
  const offset = (safePage - 1) * perPage;

  const enrolledUsers = await db
    .select({
      enrollmentId: enrollments.id,
      enrolledAt: enrollments.enrolledAt,
      progressPercent: enrollments.progressPercent,
      completedAt: enrollments.completedAt,
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      userAvatar: users.avatarUrl,
      completedLessons: sql<number>`count(distinct ${lessonProgress.lessonId})`.as('completed_lessons'),
    })
    .from(enrollments)
    .innerJoin(users, eq(enrollments.userId, users.id))
    .leftJoin(
      lessonProgress,
      and(
        eq(lessonProgress.userId, users.id),
        eq(lessonProgress.completed, true),
        sql`${lessonProgress.lessonId} IN (SELECT id FROM lessons WHERE course_id = ${courseId})`
      )
    )
    .where(eq(enrollments.courseId, courseId))
    .groupBy(enrollments.id, users.id)
    .orderBy(desc(enrollments.enrolledAt))
    .limit(perPage)
    .offset(offset);

  return {
    course,
    totalLessons,
    totalEnrollments,
    enrolledUsers,
    page: safePage,
    totalPages,
  };
}

export default async function CourseEnrollmentsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { page: pageStr } = await searchParams;
  const page = normalizeCourseEnrollmentPage(pageStr);

  const data = await getCourseWithEnrollments(id, page);
  if (!data) notFound();

  return <CourseEnrollmentsView data={data} />;
}

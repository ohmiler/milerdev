import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { and, asc, eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { enrollments, lessonProgress, lessons, courses } from '@/lib/db/schema';
import { selectContinuationLesson } from '@/lib/learning-continuation';
import EmptyCourseWorkspace from './EmptyCourseWorkspace';

export const metadata: Metadata = {
  title: 'เริ่มเรียน',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ payment?: string }>;
}

async function getCourseWithAccess(slug: string, userId: string) {
  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.slug, slug))
    .limit(1);

  if (!course) return null;

  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, course.id)))
    .limit(1);

  if (!enrollment) return null;

  const [courseLessons, courseProgress] = await Promise.all([
    db
      .select()
      .from(lessons)
      .where(eq(lessons.courseId, course.id))
      .orderBy(asc(lessons.orderIndex)),
    db
      .select({
        lessonId: lessonProgress.lessonId,
        completed: lessonProgress.completed,
        watchTimeSeconds: lessonProgress.watchTimeSeconds,
        lastWatchedAt: lessonProgress.lastWatchedAt,
      })
      .from(lessonProgress)
      .innerJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
      .where(and(eq(lessonProgress.userId, userId), eq(lessons.courseId, course.id))),
  ]);

  return {
    course,
    enrollment,
    lessons: courseLessons,
    progress: courseProgress,
  };
}

export default async function LearnPage({ params, searchParams }: Props) {
  const session = await auth();

  if (!session?.user) {
    const { slug } = await params;
    redirect('/login?callbackUrl=/courses/' + slug + '/learn');
  }

  const { slug } = await params;
  const { payment } = await searchParams;
  const data = await getCourseWithAccess(slug, session.user.id);

  if (!data) notFound();

  const { course, lessons: courseLessons, progress } = data;
  const continuationLesson = selectContinuationLesson(courseLessons, progress);

  if (continuationLesson) {
    redirect('/courses/' + slug + '/learn/' + continuationLesson.id);
  }

  return <EmptyCourseWorkspace courseTitle={course.title} courseSlug={slug} paymentSuccess={payment === 'success'} />;
}

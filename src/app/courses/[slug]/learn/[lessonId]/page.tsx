import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { courses, lessons, enrollments } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import LearnPageClient from '@/components/course/LearnPageClient';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string; lessonId: string }>;
}

async function getLessonWithAccess(slug: string, lessonId: string, userId: string | null) {
  // Get course
  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.slug, slug))
    .limit(1);

  if (!course) return null;

  // Get current lesson first to check if it's free preview
  const [lesson] = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);

  if (!lesson || lesson.courseId !== course.id) return null;

  // Check enrollment (only if user is logged in)
  let isEnrolled = false;
  if (userId) {
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, userId),
          eq(enrollments.courseId, course.id)
        )
      )
      .limit(1);
    isEnrolled = !!enrollment;
  }

  // If not enrolled and not free preview, deny access
  if (!isEnrolled && !lesson.isFreePreview) {
    return { accessDenied: true, course, lesson: null, allLessons: [], isEnrolled };
  }

  // Get all lessons for sidebar
  const allLessons = await db
    .select()
    .from(lessons)
    .where(eq(lessons.courseId, course.id))
    .orderBy(asc(lessons.orderIndex));

  // Find current lesson index
  const currentIndex = allLessons.findIndex(l => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  return {
    accessDenied: false,
    course,
    lesson,
    allLessons,
    prevLesson,
    nextLesson,
    currentIndex,
    isEnrolled,
  };
}

export default async function LessonPage({ params }: Props) {
  const session = await auth();
  const { slug, lessonId } = await params;

  // Allow access for free preview even without login
  const userId = session?.user?.id || null;
  const data = await getLessonWithAccess(slug, lessonId, userId);

  if (!data) {
    notFound();
  }

  // Handle access denied - redirect to course page with message
  if (data.accessDenied) {
    redirect(`/courses/${slug}?access=denied`);
  }

  const { course, lesson, allLessons, prevLesson, nextLesson, currentIndex, isEnrolled } = data;

  // Additional null check for lesson
  if (!lesson) {
    notFound();
  }

  return (
    <LearnPageClient
      course={course}
      currentLesson={lesson}
      allLessons={allLessons}
      prevLesson={prevLesson}
      nextLesson={nextLesson}
      currentIndex={currentIndex ?? 0}
      isEnrolled={isEnrolled ?? false}
    />
  );
}

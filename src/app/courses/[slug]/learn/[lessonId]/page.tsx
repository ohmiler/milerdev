import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { courses, lessons, enrollments, lessonProgress } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import LearnPageClient from '@/components/course/LearnPageClient';
import { generateSignedVideoUrl, extractBunnyVideoId, isBunnyVideo } from '@/lib/bunny';
import sanitizeHtml from 'sanitize-html';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string; lessonId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lessonId } = await params;
  const [lesson] = await db
    .select({ title: lessons.title })
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);
  const [course] = await db
    .select({ title: courses.title })
    .from(courses)
    .where(eq(courses.slug, slug))
    .limit(1);

  const lessonTitle = lesson?.title || 'บทเรียน';
  const courseTitle = course?.title || 'คอร์ส';

  return {
    title: `${lessonTitle} - ${courseTitle}`,
    robots: { index: false },
  };
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

  // Get completed lesson IDs for this user
  let completedLessonIds: string[] = [];
  if (userId) {
    const completedProgress = await db
      .select({ lessonId: lessonProgress.lessonId })
      .from(lessonProgress)
      .innerJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
      .where(
        and(
          eq(lessonProgress.userId, userId),
          eq(lessons.courseId, course.id),
          eq(lessonProgress.completed, true)
        )
      );
    completedLessonIds = completedProgress.map(p => p.lessonId);
  }

  return {
    accessDenied: false,
    course,
    lesson,
    allLessons,
    prevLesson,
    nextLesson,
    currentIndex,
    isEnrolled,
    completedLessonIds,
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

  const { course, lesson, allLessons, prevLesson, nextLesson, currentIndex, isEnrolled, completedLessonIds } = data;

  // Additional null check for lesson
  if (!lesson) {
    notFound();
  }

  // Sanitize lesson content HTML on the server
  const signedLesson = { ...lesson };
  if (signedLesson.content) {
    signedLesson.content = sanitizeHtml(signedLesson.content, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3', 'pre', 'code', 'span', 'del']),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        'a': ['href', 'target', 'rel'],
        'code': ['class'],
        'span': ['class', 'style'],
        'pre': ['class'],
      },
    });
  }

  // Sign Bunny.net video URL on the server
  if (signedLesson.videoUrl && isBunnyVideo(signedLesson.videoUrl)) {
    const videoGuid = extractBunnyVideoId(signedLesson.videoUrl);
    if (videoGuid) {
      signedLesson.videoUrl = generateSignedVideoUrl(videoGuid);
    }
  }

  return (
    <LearnPageClient
      course={course}
      currentLesson={signedLesson}
      allLessons={allLessons}
      prevLesson={prevLesson}
      nextLesson={nextLesson}
      currentIndex={currentIndex ?? 0}
      isEnrolled={isEnrolled ?? false}
      completedLessonIds={completedLessonIds ?? []}
    />
  );
}

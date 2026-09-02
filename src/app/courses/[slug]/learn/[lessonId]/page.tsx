import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { courses, lessons } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import LearnPageClient from '@/components/course/LearnPageClient';
import { getLearningWorkspaceProjection } from '@/lib/learning-workspace';

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
    robots: { index: false, follow: false },
  };
}

export default async function LessonPage({ params }: Props) {
  const [session, { slug, lessonId }] = await Promise.all([auth(), params]);
  const projection = await getLearningWorkspaceProjection({
    memberId: session?.user?.id ?? null,
    courseSlug: slug,
    lessonId,
  });

  if (projection.kind === 'not_found') notFound();
  if (projection.kind === 'access_denied') {
    redirect(`/courses/${projection.courseSlug}?access=denied`);
  }

  const { playbackUrl: videoUrl, ...currentLesson } = projection.currentLesson;
  return (
    <LearnPageClient
      course={projection.course}
      currentLesson={{ ...currentLesson, videoUrl }}
      allLessons={projection.curriculum}
      prevLesson={projection.previousLesson}
      nextLesson={projection.nextLesson}
      currentIndex={projection.currentIndex}
      isEnrolled={projection.isEnrolled}
      canTrackProgress={projection.canTrackProgress}
      completedLessonIds={projection.completedLessonIds}
      currentProgress={projection.currentProgress}
    />
  );
}

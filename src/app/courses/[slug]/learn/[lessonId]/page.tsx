import { cache } from 'react';
import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import LearnPageClient from '@/components/course/LearnPageClient';
import { readLearnerQuiz } from '@/lib/learning/lesson-quiz-store';
import { getLearningWorkspaceProjection } from '@/lib/learning/workspace';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string; lessonId: string }>;
}

// The page and its metadata share one authorized projection per request, so the title never
// names a lesson or course the visitor may not see.
const loadLesson = cache(async (slug: string, lessonId: string) => {
  const session = await auth();
  const projection = await getLearningWorkspaceProjection({
    memberId: session?.user?.id ?? null,
    courseSlug: slug,
    lessonId,
  });
  return { session, projection };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lessonId } = await params;
  const { projection } = await loadLesson(slug, lessonId);

  return {
    title: projection.kind === 'ready'
      ? `${projection.currentLesson.title} - ${projection.course.title}`
      : 'บทเรียน',
    robots: { index: false, follow: false },
  };
}

export default async function LessonPage({ params }: Props) {
  const { slug, lessonId } = await params;
  const { session, projection } = await loadLesson(slug, lessonId);

  if (projection.kind === 'not_found') notFound();
  if (projection.kind === 'access_denied') {
    redirect(`/courses/${projection.courseSlug}?access=denied`);
  }

  // The projection has already authorized this lesson, so its quiz may be shown (without answers).
  const quiz = await readLearnerQuiz(projection.canTrackProgress ? session?.user?.id ?? null : null, lessonId);
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
      quiz={quiz}
    />
  );
}

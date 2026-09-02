import 'server-only';

import { and, asc, eq } from 'drizzle-orm';
import sanitizeHtml from 'sanitize-html';

import { extractBunnyVideoInfo, generateSignedVideoUrl, isBunnyVideo } from '@/lib/bunny';
import { db } from '@/lib/db';
import { courses, enrollments, lessonProgress, lessons } from '@/lib/db/schema';

type CourseFact = { id: string; slug: string; title: string };
type LessonAccessFact = {
  id: string;
  courseId: string;
  isFreePreview: boolean | null;
};
type CurrentLessonFact = LessonAccessFact & {
  title: string;
  content: string | null;
  videoUrl: string | null;
  videoDuration: number | null;
};
type CurriculumFact = {
  id: string;
  title: string;
  videoDuration: number | null;
  isFreePreview: boolean | null;
};
type ProgressFact = {
  lessonId: string;
  completed: boolean | null;
  watchTimeSeconds: number | null;
};

export type LearningWorkspaceStore = {
  readCourse(courseSlug: string): Promise<CourseFact | null>;
  readLessonAccess(lessonId: string): Promise<LessonAccessFact | null>;
  readAuthorizedLesson(
    lessonId: string,
    accessMode: 'enrolled' | 'free_preview',
  ): Promise<CurrentLessonFact | null>;
  hasEnrollment(memberId: string, courseId: string): Promise<boolean>;
  readCurriculum(courseId: string): Promise<CurriculumFact[]>;
  readProgress(memberId: string, courseId: string): Promise<ProgressFact[]>;
};

export type LearningCurriculumLesson = {
  id: string;
  title: string;
  videoDuration: number | null;
  isFreePreview: boolean;
};

export type LearningWorkspaceProjection =
  | { kind: 'not_found' }
  | { kind: 'access_denied'; courseSlug: string }
  | {
    kind: 'ready';
    course: CourseFact;
    currentLesson: {
      id: string;
      title: string;
      content: string | null;
      playbackUrl: string | null;
      videoDuration: number | null;
      isFreePreview: boolean;
    };
    curriculum: LearningCurriculumLesson[];
    previousLesson: LearningCurriculumLesson | null;
    nextLesson: LearningCurriculumLesson | null;
    currentIndex: number;
    isEnrolled: boolean;
    canTrackProgress: boolean;
    completedLessonIds: string[];
    currentProgress: { completed: boolean; watchTimeSeconds: number };
  };

const databaseStore: LearningWorkspaceStore = {
  async readCourse(courseSlug) {
    const [course] = await db
      .select({ id: courses.id, slug: courses.slug, title: courses.title })
      .from(courses)
      .where(eq(courses.slug, courseSlug))
      .limit(1);
    return course ?? null;
  },
  async readLessonAccess(lessonId) {
    const [lesson] = await db
      .select({
        id: lessons.id,
        courseId: lessons.courseId,
        isFreePreview: lessons.isFreePreview,
      })
      .from(lessons)
      .where(eq(lessons.id, lessonId))
      .limit(1);
    return lesson ?? null;
  },
  async readAuthorizedLesson(lessonId, accessMode) {
    const [lesson] = await db
      .select({
        id: lessons.id,
        courseId: lessons.courseId,
        title: lessons.title,
        content: lessons.content,
        videoUrl: lessons.videoUrl,
        videoDuration: lessons.videoDuration,
        isFreePreview: lessons.isFreePreview,
      })
      .from(lessons)
      .where(accessMode === 'enrolled'
        ? eq(lessons.id, lessonId)
        : and(eq(lessons.id, lessonId), eq(lessons.isFreePreview, true)))
      .limit(1);
    return lesson ?? null;
  },
  async hasEnrollment(memberId, courseId) {
    const [enrollment] = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(and(
        eq(enrollments.userId, memberId),
        eq(enrollments.courseId, courseId),
      ))
      .limit(1);
    return Boolean(enrollment);
  },
  async readCurriculum(courseId) {
    return db
      .select({
        id: lessons.id,
        title: lessons.title,
        videoDuration: lessons.videoDuration,
        isFreePreview: lessons.isFreePreview,
      })
      .from(lessons)
      .where(eq(lessons.courseId, courseId))
      .orderBy(asc(lessons.orderIndex));
  },
  async readProgress(memberId, courseId) {
    return db
      .select({
        lessonId: lessonProgress.lessonId,
        completed: lessonProgress.completed,
        watchTimeSeconds: lessonProgress.watchTimeSeconds,
      })
      .from(lessonProgress)
      .innerJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
      .where(and(
        eq(lessonProgress.userId, memberId),
        eq(lessons.courseId, courseId),
      ));
  },
};

function sanitizeLessonContent(content: string | null) {
  if (!content) return null;
  return sanitizeHtml(content, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3', 'pre', 'code', 'span', 'del']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ['href', 'target', 'rel'],
      code: ['class'],
      span: ['class', 'style'],
      pre: ['class'],
    },
  });
}

function preparePlaybackUrl(videoUrl: string | null) {
  if (!videoUrl || !isBunnyVideo(videoUrl)) return videoUrl;
  const bunnyVideo = extractBunnyVideoInfo(videoUrl);
  return bunnyVideo
    ? generateSignedVideoUrl(bunnyVideo.videoId, 3600, bunnyVideo.libraryId)
    : videoUrl;
}

export async function getLearningWorkspaceProjection(
  input: { memberId: string | null; courseSlug: string; lessonId: string },
  store: LearningWorkspaceStore = databaseStore,
): Promise<LearningWorkspaceProjection> {
  const [course, lessonAccess] = await Promise.all([
    store.readCourse(input.courseSlug),
    store.readLessonAccess(input.lessonId),
  ]);
  if (!course || !lessonAccess || lessonAccess.courseId !== course.id) {
    return { kind: 'not_found' };
  }

  const isEnrolled = input.memberId
    ? await store.hasEnrollment(input.memberId, course.id)
    : false;
  if (!isEnrolled && !lessonAccess.isFreePreview) {
    return { kind: 'access_denied', courseSlug: course.slug };
  }

  const [lesson, curriculumFacts, progressFacts] = await Promise.all([
    store.readAuthorizedLesson(input.lessonId, isEnrolled ? 'enrolled' : 'free_preview'),
    store.readCurriculum(course.id),
    input.memberId ? store.readProgress(input.memberId, course.id) : Promise.resolve([]),
  ]);
  if (!lesson || lesson.courseId !== course.id) return { kind: 'not_found' };
  const curriculum = curriculumFacts.map((item): LearningCurriculumLesson => ({
    id: item.id,
    title: item.title,
    videoDuration: item.videoDuration,
    isFreePreview: Boolean(item.isFreePreview),
  }));
  const currentIndex = curriculum.findIndex((item) => item.id === lesson.id);
  if (currentIndex < 0) return { kind: 'not_found' };

  const currentProgress = progressFacts.find((item) => item.lessonId === lesson.id);
  return {
    kind: 'ready',
    course,
    currentLesson: {
      id: lesson.id,
      title: lesson.title,
      content: sanitizeLessonContent(lesson.content),
      playbackUrl: preparePlaybackUrl(lesson.videoUrl),
      videoDuration: lesson.videoDuration,
      isFreePreview: Boolean(lesson.isFreePreview),
    },
    curriculum,
    previousLesson: currentIndex > 0 ? curriculum[currentIndex - 1] : null,
    nextLesson: currentIndex < curriculum.length - 1 ? curriculum[currentIndex + 1] : null,
    currentIndex,
    isEnrolled,
    canTrackProgress: Boolean(input.memberId),
    completedLessonIds: progressFacts
      .filter((item) => item.completed)
      .map((item) => item.lessonId),
    currentProgress: {
      completed: Boolean(currentProgress?.completed),
      watchTimeSeconds: Math.max(0, currentProgress?.watchTimeSeconds ?? 0),
    },
  };
}

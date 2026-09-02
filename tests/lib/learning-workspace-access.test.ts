import { describe, expect, it, vi } from 'vitest';

import {
  getLearningWorkspaceProjection,
  type LearningWorkspaceStore,
} from '@/lib/learning-workspace';

function enrolledStore(overrides: Partial<LearningWorkspaceStore> = {}): LearningWorkspaceStore {
  return {
    async readCourse() {
      return { id: 'course-1', slug: 'typescript', title: 'TypeScript' };
    },
    async readLessonAccess() {
      return { id: 'lesson-2', courseId: 'course-1', isFreePreview: false };
    },
    async readAuthorizedLesson() {
      return {
        id: 'lesson-2',
        courseId: 'course-1',
        title: 'Lesson two',
        content: '<p>Lesson notes</p>',
        videoUrl: null,
        videoDuration: null,
        isFreePreview: false,
      };
    },
    async hasEnrollment() {
      return true;
    },
    async readCurriculum() {
      return [
        { id: 'lesson-1', title: 'Lesson one', videoDuration: 60, isFreePreview: true },
        { id: 'lesson-2', title: 'Lesson two', videoDuration: null, isFreePreview: false },
      ];
    },
    async readProgress() {
      return [
        { lessonId: 'lesson-1', completed: true, watchTimeSeconds: 60 },
        { lessonId: 'lesson-2', completed: false, watchTimeSeconds: 37 },
      ];
    },
    ...overrides,
  };
}

describe('LearningWorkspaceProjection access boundary', () => {
  it('returns enrolled progress and truthful content-only lesson fields', async () => {
    const result = await getLearningWorkspaceProjection({
      memberId: 'member-1',
      courseSlug: 'typescript',
      lessonId: 'lesson-2',
    }, enrolledStore());

    expect(result).toMatchObject({
      kind: 'ready',
      currentLesson: {
        content: '<p>Lesson notes</p>',
        playbackUrl: null,
        videoDuration: null,
      },
      isEnrolled: true,
      canTrackProgress: true,
      completedLessonIds: ['lesson-1'],
      currentProgress: { completed: false, watchTimeSeconds: 37 },
    });
  });

  it.each([
    { content: null, videoUrl: 'https://video.example/lesson', label: 'video-only' },
    { content: null, videoUrl: null, label: 'empty' },
  ])('keeps $label lesson fields truthful', async ({ content, videoUrl }) => {
    const result = await getLearningWorkspaceProjection({
      memberId: 'member-1',
      courseSlug: 'typescript',
      lessonId: 'lesson-2',
    }, enrolledStore({
      async readAuthorizedLesson() {
        return {
          id: 'lesson-2',
          courseId: 'course-1',
          title: 'Lesson two',
          content,
          videoUrl,
          videoDuration: videoUrl ? 90 : null,
          isFreePreview: false,
        };
      },
    }));

    expect(result).toMatchObject({
      kind: 'ready',
      currentLesson: {
        content,
        playbackUrl: videoUrl,
        videoDuration: videoUrl ? 90 : null,
      },
    });
  });

  it('denies a locked lesson before reading curriculum or member progress', async () => {
    const readCurriculum = vi.fn();
    const readProgress = vi.fn();
    const readAuthorizedLesson = vi.fn();
    const result = await getLearningWorkspaceProjection({
      memberId: 'member-1',
      courseSlug: 'typescript',
      lessonId: 'lesson-2',
    }, enrolledStore({
      async hasEnrollment() {
        return false;
      },
      readAuthorizedLesson,
      readCurriculum,
      readProgress,
    }));

    expect(result).toEqual({ kind: 'access_denied', courseSlug: 'typescript' });
    expect(readAuthorizedLesson).not.toHaveBeenCalled();
    expect(readCurriculum).not.toHaveBeenCalled();
    expect(readProgress).not.toHaveBeenCalled();
  });
});

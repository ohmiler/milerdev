import { describe, expect, it } from 'vitest';

import {
  getLearningWorkspaceProjection,
  type LearningWorkspaceStore,
} from '@/lib/learning-workspace';

function workspaceStore(): LearningWorkspaceStore {
  return {
    async readCourse() {
      return { id: 'course-1', slug: 'typescript', title: 'TypeScript' };
    },
    async readLessonAccess() {
      return { id: 'lesson-free', courseId: 'course-1', isFreePreview: true };
    },
    async readAuthorizedLesson() {
      return {
        id: 'lesson-free',
        courseId: 'course-1',
        title: 'Free lesson',
        content: '<p>Preview</p>',
        videoUrl: 'https://video.example/free',
        videoDuration: 120,
        isFreePreview: true,
      };
    },
    async hasEnrollment() {
      return false;
    },
    async readCurriculum() {
      const curriculumWithPrivateFields = [
        {
          id: 'lesson-free',
          title: 'Free lesson',
          content: '<p>Preview</p>',
          videoUrl: 'https://video.example/free',
          videoDuration: 120,
          isFreePreview: true,
        },
        {
          id: 'lesson-locked',
          title: 'Locked lesson',
          content: '<p>Private</p>',
          videoUrl: 'https://video.example/private',
          videoDuration: 240,
          isFreePreview: false,
        },
      ];
      return curriculumWithPrivateFields;
    },
    async readProgress() {
      throw new Error('anonymous preview must not read member progress');
    },
  };
}

describe('LearningWorkspaceProjection', () => {
  it('returns current free-preview content but strips content and video identity from curriculum records', async () => {
    const result = await getLearningWorkspaceProjection({
      memberId: null,
      courseSlug: 'typescript',
      lessonId: 'lesson-free',
    }, workspaceStore());

    expect(result).toEqual({
      kind: 'ready',
      course: { id: 'course-1', slug: 'typescript', title: 'TypeScript' },
      currentLesson: {
        id: 'lesson-free',
        title: 'Free lesson',
        content: '<p>Preview</p>',
        playbackUrl: 'https://video.example/free',
        videoDuration: 120,
        isFreePreview: true,
      },
      curriculum: [
        { id: 'lesson-free', title: 'Free lesson', videoDuration: 120, isFreePreview: true },
        { id: 'lesson-locked', title: 'Locked lesson', videoDuration: 240, isFreePreview: false },
      ],
      previousLesson: null,
      nextLesson: { id: 'lesson-locked', title: 'Locked lesson', videoDuration: 240, isFreePreview: false },
      currentIndex: 0,
      isEnrolled: false,
      canTrackProgress: false,
      completedLessonIds: [],
      currentProgress: { completed: false, watchTimeSeconds: 0 },
    });
    expect(JSON.stringify(result)).not.toContain('video.example/private');
    expect(JSON.stringify(result)).not.toContain('<p>Private</p>');
  });
});

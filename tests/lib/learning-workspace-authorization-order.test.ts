import { describe, expect, it, vi } from 'vitest';

import {
  getLearningWorkspaceProjection,
  type LearningWorkspaceStore,
} from '@/lib/learning-workspace';

describe('LearningWorkspaceProjection authorization order', () => {
  it('reads current content only through the authorized lesson query', async () => {
    const readAuthorizedLesson = vi.fn().mockResolvedValue({
      id: 'lesson-1',
      courseId: 'course-1',
      title: 'Private lesson',
      content: '<p>Authorized</p>',
      videoUrl: 'https://video.example/authorized',
      videoDuration: 90,
      isFreePreview: false,
    });
    const store: LearningWorkspaceStore = {
      readCourse: vi.fn().mockResolvedValue({ id: 'course-1', slug: 'typescript', title: 'TypeScript' }),
      readLessonAccess: vi.fn().mockResolvedValue({
        id: 'lesson-1',
        courseId: 'course-1',
        isFreePreview: false,
      }),
      readAuthorizedLesson,
      hasEnrollment: vi.fn().mockResolvedValue(true),
      readCurriculum: vi.fn().mockResolvedValue([
        { id: 'lesson-1', title: 'Private lesson', videoDuration: 90, isFreePreview: false },
      ]),
      readProgress: vi.fn().mockResolvedValue([]),
    };

    const result = await getLearningWorkspaceProjection({
      memberId: 'member-1',
      courseSlug: 'typescript',
      lessonId: 'lesson-1',
    }, store);

    expect(readAuthorizedLesson).toHaveBeenCalledWith('lesson-1', 'enrolled');
    expect(result).toMatchObject({
      kind: 'ready',
      currentLesson: {
        content: '<p>Authorized</p>',
        playbackUrl: 'https://video.example/authorized',
      },
    });
  });

  it('never reads current content when a locked lesson is denied', async () => {
    const readAuthorizedLesson = vi.fn();
    const store: LearningWorkspaceStore = {
      readCourse: vi.fn().mockResolvedValue({ id: 'course-1', slug: 'typescript', title: 'TypeScript' }),
      readLessonAccess: vi.fn().mockResolvedValue({
        id: 'lesson-1',
        courseId: 'course-1',
        isFreePreview: false,
      }),
      readAuthorizedLesson,
      hasEnrollment: vi.fn().mockResolvedValue(false),
      readCurriculum: vi.fn(),
      readProgress: vi.fn(),
    };

    await expect(getLearningWorkspaceProjection({
      memberId: 'member-1',
      courseSlug: 'typescript',
      lessonId: 'lesson-1',
    }, store)).resolves.toEqual({ kind: 'access_denied', courseSlug: 'typescript' });
    expect(readAuthorizedLesson).not.toHaveBeenCalled();
  });
});

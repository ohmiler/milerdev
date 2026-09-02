import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: {} }));
vi.mock('@/lib/learning-workspace', () => ({ getLearningWorkspaceProjection: vi.fn() }));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
  redirect: vi.fn((destination: string) => { throw new Error(`NEXT_REDIRECT:${destination}`); }),
}));
vi.mock('@/components/course/LearnPageClient', () => ({ default: () => null }));

import { auth } from '@/lib/auth';
import { getLearningWorkspaceProjection } from '@/lib/learning-workspace';

describe('lesson learning workspace page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ user: { id: 'member-1' } } as never);
  });

  it('renders only the authorized projection and resumes current progress', async () => {
    vi.mocked(getLearningWorkspaceProjection).mockResolvedValue({
      kind: 'ready',
      course: { id: 'course-1', slug: 'typescript', title: 'TypeScript' },
      currentLesson: {
        id: 'lesson-2',
        title: 'Lesson two',
        content: '<p>Notes</p>',
        playbackUrl: 'https://signed.example/current',
        videoDuration: 90,
        isFreePreview: false,
      },
      curriculum: [
        { id: 'lesson-1', title: 'Lesson one', videoDuration: 60, isFreePreview: true },
        { id: 'lesson-2', title: 'Lesson two', videoDuration: 90, isFreePreview: false },
      ],
      previousLesson: { id: 'lesson-1', title: 'Lesson one', videoDuration: 60, isFreePreview: true },
      nextLesson: null,
      currentIndex: 1,
      isEnrolled: true,
      canTrackProgress: true,
      completedLessonIds: ['lesson-1'],
      currentProgress: { completed: false, watchTimeSeconds: 37 },
    });

    const { default: LessonPage } = await import('@/app/courses/[slug]/learn/[lessonId]/page');
    const element = await LessonPage({
      params: Promise.resolve({ slug: 'typescript', lessonId: 'lesson-2' }),
    });

    expect(getLearningWorkspaceProjection).toHaveBeenCalledWith({
      memberId: 'member-1',
      courseSlug: 'typescript',
      lessonId: 'lesson-2',
    });
    expect(element.props).toMatchObject({
      course: { id: 'course-1', slug: 'typescript', title: 'TypeScript' },
      currentLesson: {
        id: 'lesson-2',
        title: 'Lesson two',
        content: '<p>Notes</p>',
        videoUrl: 'https://signed.example/current',
      },
      allLessons: [
        { id: 'lesson-1', title: 'Lesson one', videoDuration: 60, isFreePreview: true },
        { id: 'lesson-2', title: 'Lesson two', videoDuration: 90, isFreePreview: false },
      ],
      currentProgress: { completed: false, watchTimeSeconds: 37 },
    });
    expect(element.props.currentLesson).not.toHaveProperty('playbackUrl');
  });
});

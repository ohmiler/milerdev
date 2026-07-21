import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  selectContinuationLesson,
  sortCoursesByLearningActivity,
} from '@/lib/learning-continuation';

const lessons = [
  { id: 'lesson-1', orderIndex: 1 },
  { id: 'lesson-2', orderIndex: 2 },
  { id: 'lesson-3', orderIndex: 3 },
];

describe('selectContinuationLesson', () => {
  it('selects the first ordered lesson when the learner has no progress', () => {
    expect(selectContinuationLesson(lessons, [])?.id).toBe('lesson-1');
  });

  it('resumes the most recently watched unfinished lesson', () => {
    const progress = [
      {
        lessonId: 'lesson-1',
        completed: false,
        watchTimeSeconds: 90,
        lastWatchedAt: new Date('2026-07-20T09:00:00Z'),
      },
      {
        lessonId: 'lesson-2',
        completed: false,
        watchTimeSeconds: 30,
        lastWatchedAt: new Date('2026-07-21T09:00:00Z'),
      },
    ];

    expect(selectContinuationLesson(lessons, progress)?.id).toBe('lesson-2');
  });

  it('advances to the first incomplete lesson when prior activity is complete', () => {
    const progress = [
      {
        lessonId: 'lesson-1',
        completed: true,
        watchTimeSeconds: 300,
        lastWatchedAt: new Date('2026-07-21T09:00:00Z'),
      },
    ];

    expect(selectContinuationLesson(lessons, progress)?.id).toBe('lesson-2');
  });

  it('returns the first lesson for review after every lesson is complete', () => {
    const progress = lessons.map((lesson, index) => ({
      lessonId: lesson.id,
      completed: true,
      watchTimeSeconds: 300,
      lastWatchedAt: new Date(`2026-07-2${index + 1}T09:00:00Z`),
    }));

    expect(selectContinuationLesson(lessons, progress)?.id).toBe('lesson-1');
  });
});

describe('generic learning entry', () => {
  it('keeps continuation redirects and gives an honest recovery path when no lesson exists', () => {
    const source = readFileSync('src/app/courses/[slug]/learn/page.tsx', 'utf8');
    const presentation = readFileSync('src/app/courses/[slug]/learn/EmptyCourseWorkspace.tsx', 'utf8');

    expect(source).toContain('selectContinuationLesson(courseLessons, progress)');
    expect(source).toContain("redirect('/courses/' + slug + '/learn/' + continuationLesson.id)");
    expect(presentation).toContain('คอร์สนี้ยังไม่มีบทเรียนที่เปิดให้เรียน');
    expect(presentation).toContain('ทีมกำลังเตรียมเนื้อหาบทเรียน');
    expect(presentation).toContain('href="/dashboard"');
    expect(presentation).toContain('href="/contact"');
    expect(source + presentation).not.toContain('style={{');
    expect(source + presentation).not.toContain('<LessonList');
  });

  it('keeps the lesson loading state accessible and within the learning workspace', () => {
    const loading = readFileSync('src/app/courses/[slug]/learn/[lessonId]/loading.tsx', 'utf8');

    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain('role="status"');
    expect(loading).toContain('กำลังโหลดบทเรียน กรุณารอสักครู่');
    expect(loading).not.toContain('style={{');
    expect(loading).not.toContain('borderRadius');
  });
});

describe('sortCoursesByLearningActivity', () => {
  it('prefers latest learning activity and falls back to enrollment recency', () => {
    const courses = [
      {
        id: 'recent-enrollment',
        enrolledAt: new Date('2026-07-20T09:00:00Z'),
        progress: [],
      },
      {
        id: 'recent-learning',
        enrolledAt: new Date('2026-07-01T09:00:00Z'),
        progress: [
          {
            lessonId: 'lesson-1',
            completed: false,
            watchTimeSeconds: 60,
            lastWatchedAt: new Date('2026-07-21T09:00:00Z'),
          },
        ],
      },
      {
        id: 'older-enrollment',
        enrolledAt: new Date('2026-07-10T09:00:00Z'),
        progress: [],
      },
    ];

    expect(sortCoursesByLearningActivity(courses).map(course => course.id)).toEqual([
      'recent-learning',
      'recent-enrollment',
      'older-enrollment',
    ]);
  });
});

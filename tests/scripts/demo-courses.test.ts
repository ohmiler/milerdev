import { describe, expect, it } from 'vitest';

import { DEMO_COURSES, DEMO_VIDEOS } from '../../scripts/demo-courses/catalog';
import { buildDemoRows, demoLessonHtml } from '../../scripts/demo-courses/rows';
import { assertLocalDemoTarget } from '../../scripts/demo-courses/target';

const rows = buildDemoRows(new Date('2026-10-06T00:00:00Z'));

describe('demo course seed target', () => {
  it.each([
    'mysql://root@localhost:3306/milerdev',
    'mysql://root:pw@127.0.0.1/milerdev',
    'mysql://root@[::1]:3307/milerdev',
  ])('accepts a database on this machine: %s', (url) => {
    expect(() => assertLocalDemoTarget(url, 'development')).not.toThrow();
  });

  it.each([
    ['a remote host', 'mysql://user:pw@db.example.com:3306/milerdev'],
    ['a host that only starts with localhost', 'mysql://user@localhost.example.com/milerdev'],
    ['a non-MySQL URL', 'postgres://user@localhost/milerdev'],
    ['a missing URL', undefined],
  ])('refuses %s', (_, url) => {
    expect(() => assertLocalDemoTarget(url, 'development')).toThrow();
  });

  it('refuses NODE_ENV=production even on localhost', () => {
    expect(() => assertLocalDemoTarget('mysql://root@localhost/milerdev', 'production')).toThrow();
  });
});

describe('demo course rows', () => {
  const allIds = [
    rows.instructor.id!, rows.bundle.id!,
    ...rows.courses.map((row) => row.id!), ...rows.sections.map((row) => row.id!),
    ...rows.lessons.map((row) => row.id!), ...rows.quizQuestions.map((row) => row.id!),
    ...rows.reviews.map((row) => row.id!), ...rows.bundleCourses.map((row) => row.id!),
  ];

  it('marks every row id with the demo prefix, keeps it unique and within varchar(36)', () => {
    expect(allIds.every((id) => id.startsWith('demo-') && id.length <= 36)).toBe(true);
    expect(new Set(allIds).size).toBe(allIds.length);
    expect(new Set(rows.courses.map((course) => course.slug)).size).toBe(rows.courses.length);
  });

  it('orders lessons the way section writes do: one gapped sequence that follows section order', () => {
    for (const course of rows.courses) {
      const sectionOrder = rows.sections.filter((section) => section.courseId === course.id).map((section) => section.id);
      const courseLessons = rows.lessons.filter((lesson) => lesson.courseId === course.id);
      expect(courseLessons.map((lesson) => lesson.orderIndex)).toEqual(courseLessons.map((_, index) => (index + 1) * 100));
      const sectionsInLessonOrder = courseLessons.map((lesson) => sectionOrder.indexOf(lesson.sectionId!));
      expect(sectionsInLessonOrder).toEqual([...sectionsInLessonOrder].sort((a, b) => a - b));
      expect(sectionsInLessonOrder.every((index) => index >= 0)).toBe(true);
    }
  });

  it('stores each video lesson with its YouTube URL and the video\'s real length', () => {
    const byId = new Map<string, { seconds: number }>(Object.values(DEMO_VIDEOS).map((video) => [video.youtubeId, video]));
    for (const lesson of rows.lessons.filter((row) => row.videoUrl)) {
      const youtubeId = new URL(lesson.videoUrl!).searchParams.get('v')!;
      expect(byId.get(youtubeId)?.seconds).toBe(lesson.videoDuration);
    }
    expect(rows.lessons.filter((row) => !row.videoUrl).every((row) => row.videoDuration === 0)).toBe(true);
  });

  it('writes quizzes within the editor rules, without always putting the answer first', () => {
    // Same limits as the admin quiz editor: 2-6 options, exactly one correct, bounded text.
    for (const question of rows.quizQuestions) {
      expect(question.options.length).toBeGreaterThanOrEqual(2);
      expect(question.options.length).toBeLessThanOrEqual(6);
      expect(question.options.filter((option) => option.isCorrect)).toHaveLength(1);
      expect(new Set(question.options.map((option) => option.id)).size).toBe(question.options.length);
      expect(question.prompt.length).toBeLessThanOrEqual(2000);
      expect(question.options.every((option) => option.text.trim().length > 0 && option.text.length <= 500)).toBe(true);
    }
    const perLesson = Map.groupBy(rows.quizQuestions, (question) => question.lessonId);
    expect([...perLesson.values()].every((questions) => questions.length <= 20)).toBe(true);
    expect(rows.quizQuestions.some((question) => !question.options[0].isCorrect)).toBe(true);
  });

  it('gives every published course a free preview and keeps promotions below the price', () => {
    for (const course of rows.courses.filter((row) => row.status === 'published')) {
      expect(rows.lessons.some((lesson) => lesson.courseId === course.id && lesson.isFreePreview)).toBe(true);
      if (course.promoPrice) expect(Number(course.promoPrice)).toBeLessThan(Number(course.price));
    }
  });

  it('bundles only published paid demo courses and prices the bundle below their sum', () => {
    const bundled = rows.bundleCourses.map((link) => rows.courses.find((course) => course.id === link.courseId)!);
    expect(bundled.every((course) => course.status === 'published' && Number(course.price) > 0)).toBe(true);
    expect(Number(rows.bundle.price)).toBeLessThan(bundled.reduce((sum, course) => sum + Number(course.price), 0));
  });

  it('attaches demo reviews to no account and makes them visible on course pages', () => {
    expect(rows.reviews.every((review) => review.userId === null && review.isVerified === true && review.isHidden === false)).toBe(true);
    expect(rows.reviews.every((review) => review.rating! >= 1 && review.rating! <= 5)).toBe(true);
  });

  it('escapes code samples and credits the video channel in lesson content', () => {
    const lesson = DEMO_COURSES[0].sections[1].lessons[0];
    const html = demoLessonHtml(lesson);
    expect(html).toContain('&lt;h1&gt;');
    expect(html).not.toContain('<h1>');
    expect(html).toContain('จากช่อง MilerDev บน YouTube');
  });
});

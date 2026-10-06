import type {
  NewBundle,
  NewBundleCourse,
  NewCourse,
  NewCourseSection,
  NewLesson,
  NewLessonQuizQuestion,
  NewReview,
  NewUser,
} from '../../src/lib/db/schema';
import { DEMO_BUNDLE, DEMO_COURSES, DEMO_INSTRUCTOR, DEMO_VIDEO_CHANNEL, DEMO_VIDEOS, type DemoLesson } from './catalog';

// Every demo row id starts with this prefix. Real ids are cuid2 values, which never contain
// a hyphen, so removing "demo-%" rows can never touch real data.
export const DEMO_ID_PREFIX = 'demo-';
const ORDER_GAP = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

export const demoCourseId = (key: string) => `${DEMO_ID_PREFIX}course-${key}`;
export const demoTagId = (slug: string) => `${DEMO_ID_PREFIX}tag-${slug}`;
export const DEMO_INSTRUCTOR_ID = `${DEMO_ID_PREFIX}user-instructor`;
export const DEMO_BUNDLE_ID = `${DEMO_ID_PREFIX}bundle-frontend`;

export function demoTagSlug(name: string) {
  return name.toLowerCase().replace(/\./g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

export function demoLessonHtml(lesson: DemoLesson): string {
  const parts = [
    `<p>${escapeHtml(lesson.intro)}</p>`,
    '<h3>ประเด็นสำคัญ</h3>',
    `<ul>${lesson.points.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul>`,
  ];
  if (lesson.code) {
    parts.push('<h3>ตัวอย่างโค้ด</h3>');
    parts.push(`<pre><code class="language-${lesson.code.language}">${escapeHtml(lesson.code.source)}</code></pre>`);
  }
  if (lesson.exercise) {
    parts.push('<h3>แบบฝึกหัด</h3>', `<p>${escapeHtml(lesson.exercise)}</p>`);
  }
  if (lesson.video) {
    const video = DEMO_VIDEOS[lesson.video];
    parts.push(`<p><em>วิดีโอประกอบ: "${escapeHtml(video.title)}" จากช่อง ${DEMO_VIDEO_CHANNEL} บน YouTube</em></p>`);
  }
  return parts.join('');
}

export type DemoRows = {
  instructor: NewUser;
  courses: NewCourse[];
  courseTagNames: { courseId: string; tagName: string }[];
  sections: NewCourseSection[];
  lessons: NewLesson[];
  quizQuestions: NewLessonQuizQuestion[];
  reviews: NewReview[];
  bundle: NewBundle;
  bundleCourses: NewBundleCourse[];
};

export function buildDemoRows(now: Date): DemoRows {
  const daysAgo = (days: number) => new Date(now.getTime() - days * DAY_MS);
  const rows: DemoRows = {
    instructor: {
      id: DEMO_INSTRUCTOR_ID,
      email: DEMO_INSTRUCTOR.email,
      name: DEMO_INSTRUCTOR.name,
      role: 'instructor',
      passwordHash: null,
      createdAt: daysAgo(400),
      updatedAt: daysAgo(400),
    },
    courses: [],
    courseTagNames: [],
    sections: [],
    lessons: [],
    quizQuestions: [],
    reviews: [],
    bundle: {
      id: DEMO_BUNDLE_ID,
      title: DEMO_BUNDLE.title,
      slug: DEMO_BUNDLE.slug,
      description: DEMO_BUNDLE.description,
      price: DEMO_BUNDLE.price,
      status: 'published',
      createdAt: daysAgo(20),
      updatedAt: daysAgo(20),
    },
    bundleCourses: DEMO_BUNDLE.courseKeys.map((key, index) => ({
      id: `${DEMO_ID_PREFIX}bundle-course-${key}`,
      bundleId: DEMO_BUNDLE_ID,
      courseId: demoCourseId(key),
      orderIndex: index,
    })),
  };

  DEMO_COURSES.forEach((course, courseIndex) => {
    const courseId = demoCourseId(course.key);
    // Older courses first, so "newest" sorting in the catalog has something to show.
    const createdAt = daysAgo(180 - courseIndex * 25);
    rows.courses.push({
      id: courseId,
      title: course.title,
      slug: course.slug,
      description: course.description,
      price: course.price,
      status: course.status,
      instructorId: DEMO_INSTRUCTOR_ID,
      promoPrice: course.promo?.price ?? null,
      promoStartsAt: course.promo ? daysAgo(1) : null,
      promoEndsAt: course.promo ? new Date(now.getTime() + course.promo.endsInDays * DAY_MS) : null,
      createdAt,
      updatedAt: createdAt,
    });
    for (const tagName of course.tags) rows.courseTagNames.push({ courseId, tagName });

    let lessonPosition = 0;
    course.sections.forEach((section, sectionIndex) => {
      const sectionId = `${DEMO_ID_PREFIX}section-${course.key}-${sectionIndex + 1}`;
      rows.sections.push({ id: sectionId, courseId, title: section.title, orderIndex: (sectionIndex + 1) * ORDER_GAP, createdAt });
      for (const lesson of section.lessons) {
        lessonPosition += 1;
        const lessonId = `${DEMO_ID_PREFIX}lesson-${course.key}-${lesson.key}`;
        const video = lesson.video ? DEMO_VIDEOS[lesson.video] : null;
        rows.lessons.push({
          id: lessonId,
          courseId,
          sectionId,
          title: lesson.title,
          content: demoLessonHtml(lesson),
          videoUrl: video ? `https://www.youtube.com/watch?v=${video.youtubeId}` : null,
          videoDuration: video?.seconds ?? 0,
          orderIndex: lessonPosition * ORDER_GAP,
          isFreePreview: Boolean(lesson.freePreview),
          createdAt,
        });
        lesson.quiz?.forEach((question, questionIndex) => {
          // The catalog lists the correct option first; rotate so it is not always first on screen.
          const shift = (lessonPosition + questionIndex) % question.options.length;
          const options = [...question.options.slice(shift), ...question.options.slice(0, shift)];
          rows.quizQuestions.push({
            id: `${DEMO_ID_PREFIX}quiz-${course.key}-${lesson.key}-${questionIndex + 1}`,
            lessonId,
            prompt: question.prompt,
            options: options.map((option, optionIndex) => ({ id: `opt-${optionIndex + 1}`, ...option })),
            explanation: question.explanation ?? null,
            orderIndex: (questionIndex + 1) * ORDER_GAP,
            createdAt,
            updatedAt: createdAt,
          });
        });
      }
    });

    course.reviews.forEach((review, reviewIndex) => {
      rows.reviews.push({
        id: `${DEMO_ID_PREFIX}review-${course.key}-${reviewIndex + 1}`,
        userId: null,
        courseId,
        rating: review.rating,
        comment: review.comment,
        displayName: review.name,
        isVerified: false,
        isHidden: false,
        createdAt: daysAgo(review.daysAgo),
        updatedAt: daysAgo(review.daysAgo),
      });
    });
  });

  return rows;
}

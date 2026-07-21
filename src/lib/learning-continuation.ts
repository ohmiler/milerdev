export interface ContinuationLesson {
  id: string;
  orderIndex: number;
}

export interface ContinuationProgress {
  lessonId: string;
  completed: boolean | null;
  watchTimeSeconds: number | null;
  lastWatchedAt: Date | null;
}

interface CourseWithLearningActivity {
  enrolledAt: Date | null;
  progress: readonly ContinuationProgress[];
}

function timestamp(value: Date | null | undefined) {
  if (!value) return 0;
  const time = value.getTime();
  return Number.isFinite(time) ? time : 0;
}

export function selectContinuationLesson(
  lessons: readonly ContinuationLesson[],
  progress: readonly ContinuationProgress[],
) {
  if (lessons.length === 0) return null;

  const orderedLessons = [...lessons].sort((a, b) => a.orderIndex - b.orderIndex);
  const progressByLesson = new Map(progress.map(item => [item.lessonId, item]));
  const watchedUnfinished = orderedLessons
    .filter((lesson) => {
      const item = progressByLesson.get(lesson.id);
      return Boolean(
        item
        && !item.completed
        && (timestamp(item.lastWatchedAt) > 0 || (item.watchTimeSeconds ?? 0) > 0),
      );
    })
    .sort((a, b) => {
      const aProgress = progressByLesson.get(a.id);
      const bProgress = progressByLesson.get(b.id);
      return timestamp(bProgress?.lastWatchedAt) - timestamp(aProgress?.lastWatchedAt)
        || a.orderIndex - b.orderIndex;
    });

  if (watchedUnfinished[0]) return watchedUnfinished[0];

  return orderedLessons.find((lesson) => !progressByLesson.get(lesson.id)?.completed)
    ?? orderedLessons[0];
}

export function getLatestLearningActivity(
  progress: readonly ContinuationProgress[],
  enrolledAt: Date | null,
) {
  const latestProgress = progress.reduce(
    (latest, item) => Math.max(latest, timestamp(item.lastWatchedAt)),
    0,
  );

  return Math.max(latestProgress, timestamp(enrolledAt));
}

export function sortCoursesByLearningActivity<T extends CourseWithLearningActivity>(
  courses: readonly T[],
) {
  return courses
    .map((course, index) => ({ course, index }))
    .sort((a, b) => (
      getLatestLearningActivity(b.course.progress, b.course.enrolledAt)
      - getLatestLearningActivity(a.course.progress, a.course.enrolledAt)
      || a.index - b.index
    ))
    .map(({ course }) => course);
}

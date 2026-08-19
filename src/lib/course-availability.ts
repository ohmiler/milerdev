export const COURSE_NOT_READY = 'COURSE_NOT_READY' as const;

export class CourseAvailabilityError extends Error {
  constructor(readonly code: typeof COURSE_NOT_READY = COURSE_NOT_READY) {
    super(code);
    this.name = 'CourseAvailabilityError';
  }
}

export function requireCourseHasLessons(lessonCount: number): void {
  if (!Number.isFinite(lessonCount) || lessonCount <= 0) {
    throw new CourseAvailabilityError();
  }
}

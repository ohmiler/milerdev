import { asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { courseSections, lessons } from '@/lib/db/schema';

// The public course page serializes these rows into a client component, so it
// must only read fields that are safe for any visitor. Never add videoUrl or
// content: those belong to the enrollment-gated learning workspace.
export const coursePageLessonColumns = {
  id: lessons.id,
  title: lessons.title,
  videoDuration: lessons.videoDuration,
  isFreePreview: lessons.isFreePreview,
  sectionId: lessons.sectionId,
  sectionTitle: courseSections.title,
};

export type CoursePageLesson = {
  id: string;
  title: string;
  videoDuration: number | null;
  isFreePreview: boolean | null;
  sectionId: string | null;
  sectionTitle: string | null;
};

export function readCoursePageLessons(courseId: string): Promise<CoursePageLesson[]> {
  return db
    .select(coursePageLessonColumns)
    .from(lessons)
    .leftJoin(courseSections, eq(lessons.sectionId, courseSections.id))
    .where(eq(lessons.courseId, courseId))
    .orderBy(asc(lessons.orderIndex), asc(lessons.id));
}

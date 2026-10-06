import 'server-only';

import { createId } from '@paralleldrive/cuid2';
import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { courseSections, lessons } from '@/lib/db/schema';
import {
  planCourseStructure,
  readCourseStructure,
  removeSectionFromStructure,
  type CourseStructure,
  type CourseStructurePlan,
} from './course-structure';

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type StructureRows = Awaited<ReturnType<typeof lockCourseStructure>>;

export type StructureWriteResult = { ok: true } | { ok: false; status: 404 | 409; error: string };

// Locks the course's sections and lessons so two editors cannot interleave order writes.
async function lockCourseStructure(tx: DatabaseTransaction, courseId: string) {
  const sectionRows = await tx
    .select({ id: courseSections.id, orderIndex: courseSections.orderIndex })
    .from(courseSections)
    .where(eq(courseSections.courseId, courseId))
    .orderBy(asc(courseSections.orderIndex), asc(courseSections.id))
    .for('update');
  const lessonRows = await tx
    .select({ id: lessons.id, sectionId: lessons.sectionId, orderIndex: lessons.orderIndex })
    .from(lessons)
    .where(eq(lessons.courseId, courseId))
    .orderBy(asc(lessons.orderIndex), asc(lessons.id))
    .for('update');
  return { sections: sectionRows, lessons: lessonRows };
}

async function applyPlan(tx: DatabaseTransaction, rows: StructureRows, plan: CourseStructurePlan) {
  const sectionOrder = new Map(rows.sections.map((section) => [section.id, section.orderIndex]));
  for (const section of plan.sections) {
    if (sectionOrder.get(section.id) === section.orderIndex) continue;
    await tx.update(courseSections).set({ orderIndex: section.orderIndex }).where(eq(courseSections.id, section.id));
  }
  const lessonRows = new Map(rows.lessons.map((lesson) => [lesson.id, lesson]));
  for (const lesson of plan.lessons) {
    const row = lessonRows.get(lesson.id);
    if (row?.orderIndex === lesson.orderIndex && row.sectionId === lesson.sectionId) continue;
    await tx
      .update(lessons)
      .set({ orderIndex: lesson.orderIndex, sectionId: lesson.sectionId })
      .where(eq(lessons.id, lesson.id));
  }
}

/** Replaces the course's section and lesson order with a structure that names every row. */
export function saveCourseStructure(courseId: string, requested: CourseStructure): Promise<StructureWriteResult> {
  return db.transaction(async (tx): Promise<StructureWriteResult> => {
    const rows = await lockCourseStructure(tx, courseId);
    const result = planCourseStructure(rows, requested);
    if (!result.ok) return { ok: false, status: 409, error: result.error };
    await applyPlan(tx, rows, result.plan);
    return { ok: true };
  });
}

/** Appends an empty section; it holds no lessons yet, so the learning order is unchanged. */
export function createCourseSection(courseId: string, title: string): Promise<string> {
  return db.transaction(async (tx) => {
    const rows = await lockCourseStructure(tx, courseId);
    const id = createId();
    await tx.insert(courseSections).values({
      id,
      courseId,
      title,
      orderIndex: Math.max(0, ...rows.sections.map((section) => section.orderIndex)) + 100,
      createdAt: new Date(),
    });
    return id;
  });
}

/** Deletes a section; its lessons join the section before it without changing their order. */
export function deleteCourseSection(courseId: string, sectionId: string): Promise<StructureWriteResult> {
  return db.transaction(async (tx): Promise<StructureWriteResult> => {
    const rows = await lockCourseStructure(tx, courseId);
    const next = removeSectionFromStructure(readCourseStructure(rows), sectionId);
    if (!next) return { ok: false, status: 404, error: 'ไม่พบหมวดนี้ในคอร์ส' };
    const remaining = { ...rows, sections: rows.sections.filter((section) => section.id !== sectionId) };
    const result = planCourseStructure(remaining, next);
    if (!result.ok) return { ok: false, status: 409, error: result.error };
    await applyPlan(tx, remaining, result.plan);
    await tx.delete(courseSections).where(and(eq(courseSections.id, sectionId), eq(courseSections.courseId, courseId)));
    return { ok: true };
  });
}

/**
 * Adds a lesson at the end of a section, or of the unsectioned lessons when sectionId is
 * null. A plain append would place it after later sections' lessons, so the course is
 * resequenced in the same transaction.
 */
export function createLessonInSection(
  courseId: string,
  sectionId: string | null,
  values: Omit<typeof lessons.$inferInsert, 'courseId' | 'sectionId' | 'orderIndex'> & { id: string },
): Promise<StructureWriteResult> {
  return db.transaction(async (tx): Promise<StructureWriteResult> => {
    const rows = await lockCourseStructure(tx, courseId);
    if (sectionId !== null && !rows.sections.some((section) => section.id === sectionId)) {
      return { ok: false, status: 404, error: 'ไม่พบหมวดนี้ในคอร์ส' };
    }
    const lastOrder = Math.max(0, ...rows.lessons.map((lesson) => lesson.orderIndex));
    const created = { id: values.id, sectionId, orderIndex: lastOrder + 1 };
    await tx.insert(lessons).values({ ...values, courseId, sectionId, orderIndex: created.orderIndex });
    const withCreated = { ...rows, lessons: [...rows.lessons, created] };
    const result = planCourseStructure(withCreated, readCourseStructure(withCreated));
    if (!result.ok) return { ok: false, status: 409, error: result.error };
    await applyPlan(tx, withCreated, result.plan);
    return { ok: true };
  });
}

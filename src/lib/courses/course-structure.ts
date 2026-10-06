// Sections only group lessons. lessons.orderIndex stays the one learning order across a
// course, so every write keeps the two in agreement: unsectioned lessons come first, then
// each section's lessons in section order. Readers that ignore sections keep working.

export type CourseStructure = {
  unsectionedLessonIds: string[];
  sections: { id: string; lessonIds: string[] }[];
};

export type CourseStructurePlan = {
  sections: { id: string; orderIndex: number }[];
  lessons: { id: string; sectionId: string | null; orderIndex: number }[];
};

type StructureRows = {
  sections: { id: string }[];
  lessons: { id: string; sectionId: string | null }[];
};

const ORDER_GAP = 100;

/** The structure implied by rows that are already in learning order. */
export function readCourseStructure({ sections, lessons }: StructureRows): CourseStructure {
  const sectionIds = new Set(sections.map((section) => section.id));
  return {
    unsectionedLessonIds: lessons
      .filter((lesson) => !lesson.sectionId || !sectionIds.has(lesson.sectionId))
      .map((lesson) => lesson.id),
    sections: sections.map((section) => ({
      id: section.id,
      lessonIds: lessons.filter((lesson) => lesson.sectionId === section.id).map((lesson) => lesson.id),
    })),
  };
}

function sameMembers(requested: string[], current: string[]) {
  const currentIds = new Set(current);
  return new Set(requested).size === requested.length
    && requested.length === current.length
    && requested.every((id) => currentIds.has(id));
}

/**
 * Turns a requested structure into order indexes. The request must name every section and
 * every lesson of the course exactly once, so a stale editor cannot drop or steal rows.
 */
export function planCourseStructure(
  current: StructureRows,
  requested: CourseStructure,
): { ok: true; plan: CourseStructurePlan } | { ok: false; error: string } {
  if (!sameMembers(requested.sections.map((section) => section.id), current.sections.map((section) => section.id))) {
    return { ok: false, error: 'หมวดในคำขอไม่ตรงกับคอร์สนี้ กรุณาโหลดหน้าใหม่' };
  }
  const blocks = [
    { sectionId: null, lessonIds: requested.unsectionedLessonIds },
    ...requested.sections.map((section) => ({ sectionId: section.id, lessonIds: section.lessonIds })),
  ];
  const lessonIds = blocks.flatMap((block) => block.lessonIds);
  if (!sameMembers(lessonIds, current.lessons.map((lesson) => lesson.id))) {
    return { ok: false, error: 'บทเรียนในคำขอไม่ตรงกับคอร์สนี้ กรุณาโหลดหน้าใหม่' };
  }

  let position = 0;
  return {
    ok: true,
    plan: {
      sections: requested.sections.map((section, index) => ({ id: section.id, orderIndex: (index + 1) * ORDER_GAP })),
      lessons: blocks.flatMap((block) => block.lessonIds.map((id) => {
        position += 1;
        return { id, sectionId: block.sectionId, orderIndex: position * ORDER_GAP };
      })),
    },
  };
}

/**
 * Removes a section without changing the learning order: its lessons join the end of the
 * section before it, or the unsectioned lessons when it is the first section.
 */
export function removeSectionFromStructure(structure: CourseStructure, sectionId: string): CourseStructure | null {
  const index = structure.sections.findIndex((section) => section.id === sectionId);
  if (index < 0) return null;
  const removed = structure.sections[index];
  const sections = structure.sections
    .filter((section) => section.id !== sectionId)
    .map((section, position) => (
      index > 0 && position === index - 1
        ? { ...section, lessonIds: [...section.lessonIds, ...removed.lessonIds] }
        : section
    ));
  return {
    unsectionedLessonIds: index === 0
      ? [...structure.unsectionedLessonIds, ...removed.lessonIds]
      : structure.unsectionedLessonIds,
    sections,
  };
}

/** Moves a lesson to the end of another section, or of the unsectioned lessons. */
export function moveLessonToSection(
  structure: CourseStructure,
  lessonId: string,
  sectionId: string | null,
): CourseStructure {
  const without = (ids: string[]) => ids.filter((id) => id !== lessonId);
  return {
    unsectionedLessonIds: sectionId === null
      ? [...without(structure.unsectionedLessonIds), lessonId]
      : without(structure.unsectionedLessonIds),
    sections: structure.sections.map((section) => ({
      id: section.id,
      lessonIds: section.id === sectionId
        ? [...without(section.lessonIds), lessonId]
        : without(section.lessonIds),
    })),
  };
}

/** Swaps a section with its neighbour; its lessons move with it. */
export function moveSection(structure: CourseStructure, sectionId: string, direction: -1 | 1): CourseStructure {
  const index = structure.sections.findIndex((section) => section.id === sectionId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= structure.sections.length) return structure;
  const sections = [...structure.sections];
  [sections[index], sections[target]] = [sections[target], sections[index]];
  return { ...structure, sections };
}

export type CurriculumGroup<T> = {
  key: string;
  sectionId: string | null;
  title: string | null;
  items: { lesson: T; index: number }[];
};

/**
 * Groups consecutive lessons that share a section for display, keeping each lesson's
 * course-wide index so numbering stays continuous across sections and pages.
 */
export function groupBySection<T extends { sectionId?: string | null; sectionTitle?: string | null }>(
  items: { lesson: T; index: number }[],
): CurriculumGroup<T>[] {
  const groups: CurriculumGroup<T>[] = [];
  for (const item of items) {
    const sectionId = item.lesson.sectionId ?? null;
    const last = groups.at(-1);
    if (last && last.sectionId === sectionId) {
      last.items.push(item);
    } else {
      groups.push({
        key: `${sectionId ?? 'unsectioned'}:${item.index}`,
        sectionId,
        title: sectionId ? item.lesson.sectionTitle ?? null : null,
        items: [item],
      });
    }
  }
  return groups;
}

export function hasSections(lessons: { sectionId?: string | null }[]) {
  return lessons.some((lesson) => Boolean(lesson.sectionId));
}

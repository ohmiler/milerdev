import { describe, expect, it } from 'vitest';

import {
  groupBySection,
  hasSections,
  moveLessonToSection,
  moveSection,
  planCourseStructure,
  readCourseStructure,
  removeSectionFromStructure,
  type CourseStructure,
} from '@/lib/courses/course-structure';

const rows = {
  sections: [{ id: 's1' }, { id: 's2' }],
  lessons: [
    { id: 'intro', sectionId: null },
    { id: 'a1', sectionId: 's1' },
    { id: 'a2', sectionId: 's1' },
    { id: 'b1', sectionId: 's2' },
  ],
};
const structure: CourseStructure = {
  unsectionedLessonIds: ['intro'],
  sections: [{ id: 's1', lessonIds: ['a1', 'a2'] }, { id: 's2', lessonIds: ['b1'] }],
};
const learningOrder = (requested: CourseStructure) => {
  const result = planCourseStructure(rows, requested);
  if (!result.ok) throw new Error(result.error);
  return result.plan.lessons.map((lesson) => lesson.id);
};

describe('course structure', () => {
  it('reads rows in learning order into unsectioned lessons followed by sections', () => {
    expect(readCourseStructure(rows)).toEqual(structure);
  });

  it('treats a lesson pointing at an unknown section as unsectioned', () => {
    expect(readCourseStructure({ sections: [], lessons: [{ id: 'x', sectionId: 'gone' }] }).unsectionedLessonIds).toEqual(['x']);
  });

  it('plans one gapped learning order across sections, unsectioned lessons first', () => {
    const result = planCourseStructure(rows, structure);
    expect(result).toEqual({
      ok: true,
      plan: {
        sections: [{ id: 's1', orderIndex: 100 }, { id: 's2', orderIndex: 200 }],
        lessons: [
          { id: 'intro', sectionId: null, orderIndex: 100 },
          { id: 'a1', sectionId: 's1', orderIndex: 200 },
          { id: 'a2', sectionId: 's1', orderIndex: 300 },
          { id: 'b1', sectionId: 's2', orderIndex: 400 },
        ],
      },
    });
  });

  it.each([
    ['omits a lesson', { ...structure, unsectionedLessonIds: [] }],
    ['repeats a lesson', { ...structure, unsectionedLessonIds: ['intro', 'a1'] }],
    ['adds a lesson from another course', { ...structure, unsectionedLessonIds: ['intro', 'foreign'] }],
    ['omits a section', { ...structure, sections: [structure.sections[0]] }],
    ['repeats a section', { ...structure, sections: [structure.sections[0], { id: 's1', lessonIds: ['b1'] }] }],
    ['names a section from another course', { ...structure, sections: [structure.sections[0], { id: 'foreign', lessonIds: ['b1'] }] }],
  ])('rejects a request that %s', (_, requested) => {
    expect(planCourseStructure(rows, requested)).toMatchObject({ ok: false });
  });

  it('removes a middle section without changing the learning order', () => {
    const next = removeSectionFromStructure(structure, 's2');
    expect(next).toEqual({ unsectionedLessonIds: ['intro'], sections: [{ id: 's1', lessonIds: ['a1', 'a2', 'b1'] }] });
    expect(planCourseStructure({ ...rows, sections: [{ id: 's1' }] }, next!)).toMatchObject({ ok: true });
  });

  it('removes the first section into the unsectioned lessons without changing the learning order', () => {
    const next = removeSectionFromStructure(structure, 's1')!;
    expect(next.unsectionedLessonIds).toEqual(['intro', 'a1', 'a2']);
    const result = planCourseStructure({ ...rows, sections: [{ id: 's2' }] }, next);
    expect(result.ok && result.plan.lessons.map((lesson) => lesson.id)).toEqual(['intro', 'a1', 'a2', 'b1']);
  });

  it('returns null when removing a section the course does not have', () => {
    expect(removeSectionFromStructure(structure, 'missing')).toBeNull();
  });

  it('moves a lesson to the end of the target section', () => {
    expect(learningOrder(moveLessonToSection(structure, 'a1', 's2'))).toEqual(['intro', 'a2', 'b1', 'a1']);
    expect(learningOrder(moveLessonToSection(structure, 'b1', null))).toEqual(['intro', 'b1', 'a1', 'a2']);
  });

  it('moves a section with its lessons and ignores moves past either end', () => {
    expect(learningOrder(moveSection(structure, 's2', -1))).toEqual(['intro', 'b1', 'a1', 'a2']);
    expect(moveSection(structure, 's1', -1)).toBe(structure);
    expect(moveSection(structure, 's2', 1)).toBe(structure);
  });

  it('groups consecutive lessons by section and keeps their course-wide index', () => {
    const lessons = [
      { id: 'intro', sectionId: null, sectionTitle: null },
      { id: 'a1', sectionId: 's1', sectionTitle: 'Basics' },
      { id: 'a2', sectionId: 's1', sectionTitle: 'Basics' },
      { id: 'b1', sectionId: 's2', sectionTitle: 'Project' },
    ];
    const groups = groupBySection(lessons.slice(2).map((lesson, offset) => ({ lesson, index: offset + 2 })));
    expect(groups.map((group) => [group.title, group.items.map((item) => item.index)])).toEqual([
      ['Basics', [2]],
      ['Project', [3]],
    ]);
    expect(hasSections(lessons)).toBe(true);
    expect(hasSections([{ sectionId: null }, {}])).toBe(false);
  });
});

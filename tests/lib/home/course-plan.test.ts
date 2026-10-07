import { describe, expect, it } from 'vitest';

import { describePathStep, HOME_LEARNING_PATH_SLUGS, planHomeCourses } from '@/lib/home/course-plan';

const course = (slug: string) => ({ slug, title: slug.toUpperCase() });
// Newest first, as the Home query returns them.
const published = ['figma', 'react', 'extra-1', 'js', 'html', 'extra-2', 'extra-3', 'extra-4', 'extra-5'].map(course);

describe('Home course plan', () => {
  it('orders the learning path by the configured slugs, not by creation date', () => {
    const plan = planHomeCourses(published, ['html', 'js', 'react']);

    expect(plan.mode).toBe('path');
    if (plan.mode !== 'path') return;
    expect(plan.steps.map((step) => step.slug)).toEqual(['html', 'js', 'react']);
    expect(plan.publishedCount).toBe(published.length);
  });

  it('lists the other published courses as extras, newest first and capped', () => {
    const plan = planHomeCourses(published, ['html', 'js', 'react']);

    if (plan.mode !== 'path') throw new Error('expected a path');
    expect(plan.extras.map((extra) => extra.slug)).toEqual(['figma', 'extra-1', 'extra-2', 'extra-3']);
  });

  it('skips path slugs that are missing or unpublished, and ignores duplicates', () => {
    const plan = planHomeCourses(published, ['html', 'retired', 'html', 'react']);

    if (plan.mode !== 'path') throw new Error('expected a path');
    expect(plan.steps.map((step) => step.slug)).toEqual(['html', 'react']);
  });

  it('falls back to the four latest courses when fewer than two steps are published', () => {
    expect(planHomeCourses(published, ['html'])).toEqual({
      mode: 'latest',
      courses: published.slice(0, 4),
      publishedCount: published.length,
    });
    expect(planHomeCourses([], HOME_LEARNING_PATH_SLUGS)).toEqual({ mode: 'latest', courses: [], publishedCount: 0 });
  });

  it('labels the first step as the place to start and later steps by what comes before', () => {
    expect(describePathStep(0, null)).toBe('ขั้นที่ 1 · เริ่มที่นี่');
    expect(describePathStep(2, 'JavaScript Mastery')).toBe('ขั้นที่ 3 · ต่อจาก JavaScript Mastery');
  });
});

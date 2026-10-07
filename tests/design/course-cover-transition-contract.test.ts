import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

// A shared-element morph needs the same name on both pages; losing either side fails silently.
describe('course cover view transition', () => {
  it('names the cover the same way on the course card and the course page', () => {
    expect(readSource('src/components/course/CourseCard.tsx'))
      .toContain('<ViewTransition name={courseCoverTransitionName(slug)} share="morph" default="none">');
    expect(readSource('src/app/courses/[slug]/page.tsx'))
      .toContain('<ViewTransition name={courseCoverTransitionName(course.slug)} share="morph" default="none">');
  });

  it('stops view transitions for visitors who ask for reduced motion', () => {
    const globals = readSource('src/app/globals.css');
    const reducedMotionBlocks = globals.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\n\}/g) ?? [];

    expect(reducedMotionBlocks.some((block) => block.includes('::view-transition-group(*)') && block.includes('animation: none'))).toBe(true);
  });
});

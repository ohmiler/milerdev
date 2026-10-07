import { describe, expect, it } from 'vitest';

import { chooseNextCourse, type PathCourse } from '@/lib/learning/next-course';

const PATH = ['html', 'js', 'react'];
const course = (slug: string, title: string): PathCourse => ({ slug, title, thumbnailUrl: null, summary: null });
const published = [course('react', 'React'), course('html', 'HTML'), course('js', 'JavaScript')];

describe('chooseNextCourse', () => {
  it('suggests the step after the furthest one the member owns, labelled with the step it follows', () => {
    expect(chooseNextCourse(['html'], published, PATH)).toMatchObject({
      slug: 'js',
      step: 'ขั้นที่ 2 · ต่อจาก HTML',
    });
    expect(chooseNextCourse(['js', 'git'], published, PATH)).toMatchObject({
      slug: 'react',
      step: 'ขั้นที่ 3 · ต่อจาก JavaScript',
    });
  });

  it('starts a member with no step yet at the first one', () => {
    expect(chooseNextCourse(['git'], published, PATH)).toMatchObject({
      slug: 'html',
      step: 'ขั้นที่ 1 · เริ่มที่นี่',
    });
  });

  it('suggests nothing once the member owns the last step, and never a step they skipped back to', () => {
    expect(chooseNextCourse(['html', 'js', 'react'], published, PATH)).toBeNull();
    expect(chooseNextCourse(['react'], published, PATH)).toBeNull();
  });

  it('skips a step that is not published, and needs at least two published steps to be a path', () => {
    const withoutJs = published.filter((item) => item.slug !== 'js');
    expect(chooseNextCourse(['html'], withoutJs, PATH)).toMatchObject({
      slug: 'react',
      step: 'ขั้นที่ 2 · ต่อจาก HTML',
    });
    expect(chooseNextCourse([], [course('html', 'HTML')], PATH)).toBeNull();
  });
});

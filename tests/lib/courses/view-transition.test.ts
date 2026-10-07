import { describe, expect, it } from 'vitest';

import { courseCoverTransitionName } from '@/lib/courses/view-transition';

const CSS_IDENT = /^-?[_a-zA-Z][_a-zA-Z0-9-]*$/;

describe('course cover transition name', () => {
  it('keeps an ordinary slug readable', () => {
    expect(courseCoverTransitionName('react-19-for-beginners')).toBe('course-cover-react-19-for-beginners');
  });

  it('turns any slug into a valid CSS identifier', () => {
    for (const slug of ['คอร์ส-react', 'Next.js App', 'a b/c', '9lives']) {
      expect(courseCoverTransitionName(slug)).toMatch(CSS_IDENT);
    }
  });

  it('never gives two different slugs the same name', () => {
    // 'aȋ' would collide with 'a b' if escapes had no end marker.
    const slugs = ['a b', 'a_b', 'a-b', 'a_20b', 'A-b', 'aȋ'];
    expect(new Set(slugs.map(courseCoverTransitionName)).size).toBe(slugs.length);
  });
});

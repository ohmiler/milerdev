import { describe, expect, it } from 'vitest';

import { getTagHue } from '@/lib/content/tag-hue';

describe('tag hue', () => {
  it.each([
    [{ slug: 'html', name: 'html' }, 'orange'],
    [{ slug: 'css', name: 'CSS' }, 'violet'],
    [{ slug: 'javascript', name: 'JavaScript' }, 'amber'],
    [{ slug: 'reactjs', name: 'ReactJS' }, 'teal'],
    [{ slug: 'figma', name: 'Figma' }, 'pink'],
    [{ slug: 'agentic-coding', name: 'agentic coding' }, 'green'],
  ])('maps %j to %s', (tag, hue) => {
    expect(getTagHue(tag)).toBe(hue);
  });

  it('keeps unknown, Thai and look-alike names neutral', () => {
    expect(getTagHue({ slug: 'backend', name: 'แบ็กเอนด์' })).toBe('neutral');
    expect(getTagHue({ slug: 'htmlx', name: 'htmlx' })).toBe('neutral');
    expect(getTagHue({ slug: 'australia', name: 'Australia' })).toBe('neutral');
  });
});

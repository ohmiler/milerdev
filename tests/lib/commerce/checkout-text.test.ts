import { describe, expect, it } from 'vitest';

import { stripeBundleDescription, stripeCourseDescription } from '@/lib/commerce/checkout-text';

describe('Stripe checkout text', () => {
  it('decodes entities and keeps words apart, instead of showing "&amp;" or joined words', () => {
    const description = stripeCourseDescription({
      summary: null,
      description: '<p>เรียน HTML &amp; CSS</p><p>สร้างเว็บแรก</p>',
    });

    expect(description).toBe('เรียน HTML & CSS สร้างเว็บแรก');
    expect(description).not.toContain('&amp;');
  });

  it('prefers the course summary written in admin', () => {
    expect(stripeCourseDescription({ summary: '  คำโปรยสั้น ๆ  ', description: '<p>ยาว</p>' })).toBe('คำโปรยสั้น ๆ');
  });

  it('stays within 500 characters and leaves out an empty description', () => {
    expect(stripeCourseDescription({ description: `<p>${'ก'.repeat(800)}</p>` })!.length).toBeLessThanOrEqual(500);
    expect(stripeCourseDescription({ description: '<p></p>' })).toBeUndefined();
    expect(stripeCourseDescription({ description: null })).toBeUndefined();
  });

  it('describes a bundle in Thai, not as "Bundle"', () => {
    expect(stripeBundleDescription(['HTML', 'JavaScript', 'React'])).toBe('รวม 3 คอร์ส: HTML, JavaScript, React');
  });
});

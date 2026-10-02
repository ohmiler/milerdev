import { describe, expect, it } from 'vitest';

import { DEFAULT_CERTIFICATE_COLOR } from '@/lib/certificates/color';
import { hasUnsavedCourseInput, type CourseFormInput } from '@/lib/courses/form-draft';

const pristine: CourseFormInput = {
  title: '',
  slug: '',
  description: '',
  price: '0',
  status: 'draft',
  thumbnailUrl: '',
  certificateColor: DEFAULT_CERTIFICATE_COLOR,
};

describe('hasUnsavedCourseInput', () => {
  it('is false for the untouched form', () => {
    expect(hasUnsavedCourseInput(pristine, [])).toBe(false);
  });

  it.each([
    ['a title', { title: 'TypeScript' }],
    ['a slug', { slug: 'ts' }],
    ['a description', { description: '<p>เนื้อหา</p>' }],
    ['a price', { price: '990' }],
    ['a published status', { status: 'published' }],
    ['a thumbnail', { thumbnailUrl: 'cdn.example.com/a.jpg' }],
    ['a certificate colour', { certificateColor: '#112233' }],
  ])('is true once the admin sets %s', (_label, change) => {
    expect(hasUnsavedCourseInput({ ...pristine, ...change }, [])).toBe(true);
  });

  it('is true when a tag is selected', () => {
    expect(hasUnsavedCourseInput(pristine, ['tag-1'])).toBe(true);
  });

  it.each([
    ['whitespace in the title', { title: '   ' }],
    ['the empty paragraph the rich text editor reports', { description: '<p></p>' }],
    ['a description of only spaces', { description: '<p>&nbsp; </p>' }],
    ['a zero price typed as text', { price: '0.00' }],
    ['a cleared price', { price: '' }],
  ])('ignores %s', (_label, change) => {
    expect(hasUnsavedCourseInput({ ...pristine, ...change }, [])).toBe(false);
  });

  it('becomes clean again when the admin undoes their input', () => {
    const edited = { ...pristine, title: 'TypeScript' };
    expect(hasUnsavedCourseInput(edited, [])).toBe(true);
    expect(hasUnsavedCourseInput({ ...edited, title: '' }, [])).toBe(false);
  });
});

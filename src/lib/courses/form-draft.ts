import { DEFAULT_CERTIFICATE_COLOR } from '@/lib/certificates/color';

export interface CourseFormInput {
  title: string;
  slug: string;
  description: string;
  price: string;
  status: string;
  thumbnailUrl: string;
  certificateColor: string;
}

function hasText(html: string): boolean {
  // The rich text editor reports an empty document as "<p></p>", which is not user input.
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;
}

/** True when the new-course form holds anything the admin would lose by leaving the page. */
export function hasUnsavedCourseInput(form: CourseFormInput, tagIds: readonly string[]): boolean {
  return Boolean(
    form.title.trim()
    || form.slug.trim()
    || hasText(form.description)
    || (form.price.trim() !== '' && Number(form.price) !== 0)
    || form.status !== 'draft'
    || form.thumbnailUrl
    || form.certificateColor !== DEFAULT_CERTIFICATE_COLOR
    || tagIds.length > 0,
  );
}

'use client';

import { useRouter } from 'next/navigation';

import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
  COURSE_CATALOG_SORTS,
  buildCourseCatalogHref,
  courseCatalogFormFields,
  type CourseCatalogQuery,
  type CourseCatalogSort as Sort,
} from '@/lib/courses/catalog-query';

const SORT_LABELS: Record<Sort, string> = {
  newest: 'ใหม่ล่าสุด',
  oldest: 'เก่าสุด',
  'price-low': 'ราคาต่ำไปสูง',
  'price-high': 'ราคาสูงไปต่ำ',
};

/** Re-sorts as soon as an option is picked; without JavaScript the form's button submits it. */
export default function CourseCatalogSort({ query }: { query: CourseCatalogQuery }) {
  const router = useRouter();

  return (
    <form method="GET" action="/courses" className="flex items-center gap-2">
      {courseCatalogFormFields(query, 'sort').map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <label htmlFor="course-catalog-sort" className="shrink-0 text-sm text-muted-foreground">เรียงตาม</label>
      <NativeSelect
        id="course-catalog-sort"
        name="sort"
        defaultValue={query.sort}
        className="min-w-40 flex-1 sm:flex-none *:data-[slot=native-select]:h-11 *:data-[slot=native-select]:bg-background"
        onChange={(event) => {
          router.push(buildCourseCatalogHref(query, { sort: event.target.value as Sort, page: 1 }));
        }}
      >
        {COURSE_CATALOG_SORTS.map((sort) => (
          <NativeSelectOption key={sort} value={sort}>{SORT_LABELS[sort]}</NativeSelectOption>
        ))}
      </NativeSelect>
      <noscript>
        <button type="submit" className="min-h-11 rounded-full border px-4 text-sm font-medium">เรียง</button>
      </noscript>
    </form>
  );
}

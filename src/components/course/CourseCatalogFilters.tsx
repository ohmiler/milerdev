import Link from 'next/link';
import { Banknote, PlayCircle, Search, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { cn } from '@/lib/utils';
import {
  buildCourseCatalogHref,
  courseCatalogFormFields,
  type CourseCatalogQuery,
} from '@/lib/courses/catalog-query';

export interface CatalogTopic {
  slug: string;
  name: string;
  count: number;
}

const PRICE_LABELS: Record<string, string> = {
  free: 'ฟรี',
  paid: 'มีค่าใช้จ่าย',
};

const PREVIEW_LABEL = 'มีบทเรียนทดลองฟรี';

/** Search by course title. A GET form works before JavaScript loads, and keeps the other facets. */
export function CourseCatalogSearch({ query }: { query: CourseCatalogQuery }) {
  return (
    <form method="GET" action="/courses" role="search" className="w-full">
      <label htmlFor="course-catalog-search" className="sr-only">ค้นหาคอร์ส</label>
      <InputGroup className="h-12 bg-background">
        <InputGroupAddon>
          <Search aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          id="course-catalog-search"
          type="search"
          name="search"
          defaultValue={query.search}
          placeholder="ค้นหา เช่น JavaScript, React"
          enterKeyHint="search"
        />
      </InputGroup>
      {courseCatalogFormFields(query, 'search').map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </form>
  );
}

/**
 * Topic chips built from the tags that published courses carry, so a new topic shows up by itself.
 * Each chip is a link: the filter lives in the URL and works without JavaScript.
 */
export function CourseCatalogTopics({
  query,
  topics,
  total,
}: {
  query: CourseCatalogQuery;
  topics: CatalogTopic[];
  total: number;
}) {
  const chips: CatalogTopic[] = [{ slug: 'all', name: 'ทั้งหมด', count: total }, ...topics];

  return (
    <nav aria-label="หัวข้อคอร์ส" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2 pb-1">
        {chips.map((topic) => {
          const active = query.tag === topic.slug;
          return (
            <li key={topic.slug}>
              <Link
                href={buildCourseCatalogHref(query, { tag: topic.slug, page: 1 })}
                aria-current={active ? 'page' : undefined}
                aria-label={`${topic.name} ${topic.count} คอร์ส`}
                className={cn(
                  'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
                  active
                    ? 'border-navy bg-navy text-background'
                    : 'bg-background text-foreground hover:border-link/40 hover:text-link',
                )}
              >
                {topic.name}
                <span className={cn('text-caption tabular-nums', active ? 'text-background/80' : 'text-muted-foreground')}>
                  {topic.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Removable filters that have no chip of their own: the search term, and the price and free-preview
 * filters that links such as Home's "ทดลองบทเรียนฟรี" set in the URL.
 */
export function CourseCatalogActiveFilters({
  query,
  className,
}: {
  query: CourseCatalogQuery;
  className?: string;
}) {
  const filters = [
    query.search
      ? {
          key: 'search',
          href: buildCourseCatalogHref(query, { search: '', page: 1 }),
          label: `ลบคำค้น ${query.search}`,
          icon: <Search data-icon="inline-start" aria-hidden="true" />,
          text: `“${query.search}”`,
        }
      : null,
    query.price !== 'all'
      ? {
          key: 'price',
          href: buildCourseCatalogHref(query, { price: 'all', page: 1 }),
          label: `ลบตัวกรองราคา ${PRICE_LABELS[query.price]}`,
          icon: <Banknote data-icon="inline-start" aria-hidden="true" />,
          text: PRICE_LABELS[query.price],
        }
      : null,
    query.preview !== 'all'
      ? {
          key: 'preview',
          href: buildCourseCatalogHref(query, { preview: 'all', page: 1 }),
          label: `ลบตัวกรอง ${PREVIEW_LABEL}`,
          icon: <PlayCircle data-icon="inline-start" aria-hidden="true" />,
          text: PREVIEW_LABEL,
        }
      : null,
  ].filter((filter) => filter !== null);

  if (filters.length === 0) return null;

  return (
    <div role="group" aria-label="ตัวกรองที่เลือก" className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="mr-1 text-caption font-medium text-muted-foreground">กำลังกรองด้วย</span>
      {filters.map((filter) => (
        <Badge key={filter.key} asChild variant="secondary">
          <Link href={filter.href} aria-label={filter.label}>
            {filter.icon}
            {filter.text}
            <X data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Badge>
      ))}
    </div>
  );
}

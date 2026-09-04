'use client';

import Link from 'next/link';
import { Banknote, Search, SlidersHorizontal, Tag, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  buildCourseCatalogHref,
  type CourseCatalogPrice,
  type CourseCatalogQuery,
  type CourseCatalogSort,
} from '@/lib/course-catalog-query';

interface CatalogTag {
  id: string;
  name: string;
  slug: string;
}

interface CourseCatalogFiltersProps {
  tags: CatalogTag[];
  search: string;
  priceFilter: CourseCatalogPrice;
  tagFilter: string;
  sort: CourseCatalogSort;
  totalCourses: number;
  hasActiveFilters: boolean;
}

const PRICE_LABELS: Record<string, string> = {
  all: 'ทุกราคา',
  free: 'ฟรี',
  paid: 'มีค่าใช้จ่าย',
};

const SORT_LABELS: Record<string, string> = {
  newest: 'ใหม่ล่าสุด',
  oldest: 'เก่าสุด',
  'price-low': 'ราคาต่ำไปสูง',
  'price-high': 'ราคาสูงไปต่ำ',
};

export default function CourseCatalogFilters({
  tags,
  search,
  priceFilter,
  tagFilter,
  sort,
  totalCourses,
  hasActiveFilters,
}: CourseCatalogFiltersProps) {
  const selectedTag = tags.find((tag) => tag.slug === tagFilter)?.name;
  const activeFilterCount = [
    Boolean(search),
    priceFilter !== 'all',
    tagFilter !== 'all',
  ].filter(Boolean).length;
  const query: CourseCatalogQuery = {
    search,
    price: priceFilter,
    tag: tagFilter,
    sort,
    page: 1,
  };

  const renderFields = (idPrefix: string, mobile = false) => (
    <form
      method="GET"
      action="/courses"
    >
      <FieldGroup
        className={cn(
          mobile
            ? 'grid gap-5'
            : 'grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(16rem,1.5fr)_repeat(3,minmax(9rem,.65fr))_auto] xl:items-end',
        )}
      >
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-search`}>ค้นหาจากชื่อคอร์ส</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
            id={`${idPrefix}-search`}
            type="search"
            name="search"
            defaultValue={search}
            placeholder="เช่น JavaScript, React"
          />
          </InputGroup>
        </Field>

        <Field>
          <FieldLabel htmlFor={`${idPrefix}-price`}>ราคา</FieldLabel>
          <NativeSelect id={`${idPrefix}-price`} name="price" defaultValue={priceFilter}>
            <NativeSelectOption value="all">ทุกราคา</NativeSelectOption>
            <NativeSelectOption value="free">ฟรี</NativeSelectOption>
            <NativeSelectOption value="paid">มีค่าใช้จ่าย</NativeSelectOption>
          </NativeSelect>
        </Field>

        <Field>
          <FieldLabel htmlFor={`${idPrefix}-tag`}>หัวข้อ</FieldLabel>
          <NativeSelect id={`${idPrefix}-tag`} name="tag" defaultValue={tagFilter}>
            <NativeSelectOption value="all">ทุกหัวข้อ</NativeSelectOption>
            {tags.map((tag) => (
              <NativeSelectOption key={tag.id} value={tag.slug}>{tag.name}</NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <Field>
          <FieldLabel htmlFor={`${idPrefix}-sort`}>เรียงตาม</FieldLabel>
          <NativeSelect id={`${idPrefix}-sort`} name="sort" defaultValue={sort}>
            <NativeSelectOption value="newest">ใหม่ล่าสุด</NativeSelectOption>
            <NativeSelectOption value="oldest">เก่าสุด</NativeSelectOption>
            <NativeSelectOption value="price-low">ราคาต่ำไปสูง</NativeSelectOption>
            <NativeSelectOption value="price-high">ราคาสูงไปต่ำ</NativeSelectOption>
          </NativeSelect>
        </Field>

        <Field
          orientation="horizontal"
          className={cn(
            'gap-3 pt-1',
            mobile && (hasActiveFilters ? 'grid grid-cols-2' : 'grid grid-cols-1'),
          )}
        >
          <Button type="submit" className={cn(mobile && 'w-full')}>แสดงผลลัพธ์</Button>
          {hasActiveFilters ? (
            <Button variant="outline" asChild className={cn(mobile && 'w-full')}>
              <Link href="/courses">ล้างตัวกรอง</Link>
            </Button>
          ) : null}
        </Field>
      </FieldGroup>
    </form>
  );

  return (
    <aside className="mb-10" aria-label="ตัวกรองคอร์ส">
      <Card className="hidden md:flex">
        <CardHeader>
          <CardTitle>คัดให้เหลือสิ่งที่ใช่</CardTitle>
        </CardHeader>
        <CardContent>{renderFields('course-filter-desktop')}</CardContent>
      </Card>

      <div className="grid gap-3 md:hidden">
        <div className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-[var(--academy-shadow-card)]">
          <Sheet>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" size="lg" className="shrink-0">
                <SlidersHorizontal data-icon="inline-start" aria-hidden="true" />
                ตัวกรอง
                {activeFilterCount > 0 ? <Badge className="min-w-5 px-1.5">{activeFilterCount}</Badge> : null}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[90svh] overflow-y-auto rounded-t-3xl border-x px-0 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted" aria-hidden="true" />
              <SheetHeader className="border-b px-5 pt-5 pb-4 text-left">
                <SheetTitle>คัดคอร์สที่ตรงกับคุณ</SheetTitle>
                <SheetDescription>ค้นหา เลือกราคาและหัวข้อ แล้วจัดลำดับผลลัพธ์ใหม่</SheetDescription>
              </SheetHeader>
              <div className="px-5 pt-5">{renderFields('course-filter-mobile', true)}</div>
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{SORT_LABELS[sort] ?? SORT_LABELS.newest}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {selectedTag ?? 'ทุกหัวข้อ'} · {PRICE_LABELS[priceFilter] ?? PRICE_LABELS.all} · {totalCourses} คอร์ส
            </p>
          </div>

          {hasActiveFilters ? (
            <Button asChild variant="ghost" size="icon-sm" className="shrink-0" aria-label="ล้างตัวกรอง">
              <Link href="/courses"><X data-icon="inline-start" aria-hidden="true" /></Link>
            </Button>
          ) : null}
        </div>

      </div>

      {activeFilterCount > 0 ? (
        <div className={'mt-4 flex flex-wrap items-center gap-2'} aria-label={'ตัวกรองที่เลือก'}>
          <span className={'mr-1 text-xs font-medium text-muted-foreground'}>กำลังกรองด้วย</span>
          {search ? (
            <Badge asChild variant={'secondary'}>
              <Link
                href={buildCourseCatalogHref(query, { search: '', page: 1 })}
                aria-label={`ลบคำค้น ${search}`}
              >
                <Search data-icon={'inline-start'} aria-hidden={'true'} />
                “{search}”
                <X data-icon={'inline-end'} aria-hidden={'true'} />
              </Link>
            </Badge>
          ) : null}
          {priceFilter !== 'all' ? (
            <Badge asChild variant={'secondary'}>
              <Link
                href={buildCourseCatalogHref(query, { price: 'all', page: 1 })}
                aria-label={`ลบตัวกรองราคา ${PRICE_LABELS[priceFilter]}`}
              >
                <Banknote data-icon={'inline-start'} aria-hidden={'true'} />
                {PRICE_LABELS[priceFilter]}
                <X data-icon={'inline-end'} aria-hidden={'true'} />
              </Link>
            </Badge>
          ) : null}
          {tagFilter !== 'all' ? (
            <Badge asChild variant={'secondary'}>
              <Link
                href={buildCourseCatalogHref(query, { tag: 'all', page: 1 })}
                aria-label={`ลบตัวกรองหัวข้อ ${selectedTag ?? tagFilter}`}
              >
                <Tag data-icon={'inline-start'} aria-hidden={'true'} />
                {selectedTag ?? tagFilter}
                <X data-icon={'inline-end'} aria-hidden={'true'} />
              </Link>
            </Badge>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}

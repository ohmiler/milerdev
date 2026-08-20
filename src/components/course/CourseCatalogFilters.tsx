'use client';

import Link from 'next/link';
import { Banknote, ListFilter, Search, SlidersHorizontal, Tag, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface CatalogTag {
  id: string;
  name: string;
  slug: string;
}

interface CourseCatalogFiltersProps {
  tags: CatalogTag[];
  search: string;
  priceFilter: string;
  tagFilter: string;
  sort: string;
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

const selectClass = 'h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none transition-shadow focus:border-ring focus:ring-3 focus:ring-ring/30';

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
    sort !== 'newest',
  ].filter(Boolean).length;

  const renderFields = (idPrefix: string, mobile = false) => (
    <form
      method="GET"
      action="/courses"
      className={mobile
        ? 'grid gap-5'
        : 'grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(16rem,1.5fr)_repeat(3,minmax(9rem,.65fr))_auto] xl:items-end'}
    >
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-search`}>ค้นหาจากชื่อคอร์ส</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id={`${idPrefix}-search`}
            type="search"
            name="search"
            defaultValue={search}
            placeholder="เช่น JavaScript, React"
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-price`}>ราคา</Label>
        <select className={selectClass} id={`${idPrefix}-price`} name="price" defaultValue={priceFilter}>
          <option value="all">ทุกราคา</option>
          <option value="free">ฟรี</option>
          <option value="paid">มีค่าใช้จ่าย</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-tag`}>หัวข้อ</Label>
        <select className={selectClass} id={`${idPrefix}-tag`} name="tag" defaultValue={tagFilter}>
          <option value="all">ทุกหัวข้อ</option>
          {tags.map((tag) => <option key={tag.id} value={tag.slug}>{tag.name}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-sort`}>เรียงตาม</Label>
        <select className={selectClass} id={`${idPrefix}-sort`} name="sort" defaultValue={sort}>
          <option value="newest">ใหม่ล่าสุด</option>
          <option value="oldest">เก่าสุด</option>
          <option value="price-low">ราคาต่ำไปสูง</option>
          <option value="price-high">ราคาสูงไปต่ำ</option>
        </select>
      </div>

      <div className={mobile ? `grid ${hasActiveFilters ? 'grid-cols-2' : 'grid-cols-1'} gap-3 pt-1` : 'flex gap-2'}>
        <Button type="submit" className={mobile ? 'w-full' : undefined}>แสดงผลลัพธ์</Button>
        {hasActiveFilters ? (
          <Button variant="outline" asChild className={mobile ? 'w-full' : undefined}>
            <Link href="/courses">ล้างตัวกรอง</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );

  return (
    <aside className="mb-10" aria-label="ตัวกรองคอร์ส">
      <Card className="hidden shadow-[var(--academy-shadow-card)] md:flex">
        <CardHeader>
          <CardTitle>คัดให้เหลือสิ่งที่ใช่</CardTitle>
        </CardHeader>
        <CardContent>{renderFields('course-filter-desktop')}</CardContent>
      </Card>

      <div className="grid gap-3 md:hidden">
        <div className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-[var(--academy-shadow-card)]">
          <Sheet>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" className="h-11 shrink-0 gap-2 rounded-xl">
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                ตัวกรอง
                {activeFilterCount > 0 ? <Badge className="min-w-5 px-1.5">{activeFilterCount}</Badge> : null}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[90svh] overflow-y-auto rounded-t-3xl border-x px-0 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted" aria-hidden="true" />
              <SheetHeader className="border-b px-5 pt-5 pb-4 text-left">
                <SheetTitle className="text-xl font-semibold">คัดคอร์สที่ตรงกับคุณ</SheetTitle>
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
              <Link href="/courses"><X className="size-4" aria-hidden="true" /></Link>
            </Button>
          ) : null}
        </div>

        {activeFilterCount > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="ตัวกรองที่เลือก">
            {search ? <Badge variant="secondary" className="shrink-0 gap-1.5"><Search className="size-3" />“{search}”</Badge> : null}
            {priceFilter !== 'all' ? <Badge variant="secondary" className="shrink-0 gap-1.5"><Banknote className="size-3" />{PRICE_LABELS[priceFilter]}</Badge> : null}
            {tagFilter !== 'all' ? <Badge variant="secondary" className="shrink-0 gap-1.5"><Tag className="size-3" />{selectedTag ?? tagFilter}</Badge> : null}
            {sort !== 'newest' ? <Badge variant="secondary" className="shrink-0 gap-1.5"><ListFilter className="size-3" />{SORT_LABELS[sort]}</Badge> : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

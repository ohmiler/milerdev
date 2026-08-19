'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CourseFiltersProps {
  totalCourses: number;
}

export default function CourseFilters({ totalCourses }: CourseFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [priceFilter, setPriceFilter] = useState(searchParams.get('price') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (priceFilter !== 'all') params.set('price', priceFilter);
    if (sortBy !== 'newest') params.set('sort', sortBy);
    
    const queryString = params.toString();
    router.push(`/courses${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }, [search, priceFilter, sortBy, router]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const clearFilters = () => {
    setSearch('');
    setPriceFilter('all');
    setSortBy('newest');
  };

  const hasFilters = search || priceFilter !== 'all' || sortBy !== 'newest';

  return (
    <div className="rounded-xl border bg-card p-4">
      {/* Search Bar */}
      <div>
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input
            type="text"
            placeholder="ค้นหาคอร์ส..."
            value={search}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>
      </div>

      {/* Filters Row */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {/* Price Filter */}
          <select
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">ราคาทั้งหมด</option>
            <option value="free">ฟรี</option>
            <option value="paid">มีค่าใช้จ่าย</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="newest">ใหม่ล่าสุด</option>
            <option value="oldest">เก่าที่สุด</option>
            <option value="price-low">ราคาต่ำ-สูง</option>
            <option value="price-high">ราคาสูง-ต่ำ</option>
          </select>

          {/* Clear Filters */}
          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilters}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
              ล้างตัวกรอง
            </Button>
          )}
        </div>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground">
          พบ <strong>{totalCourses}</strong> คอร์ส
        </div>
      </div>
    </div>
  );
}

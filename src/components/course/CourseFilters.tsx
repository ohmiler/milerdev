'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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
    <div style={{ marginBottom: '32px' }}>
      {/* Search Bar */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          position: 'relative',
          maxWidth: '500px',
        }}>
          <svg
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '20px',
              height: '20px',
              color: '#94a3b8',
            }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="ค้นหาคอร์ส..."
            value={search}
            onChange={handleSearchChange}
            style={{
              width: '100%',
              padding: '14px 16px 14px 48px',
              fontSize: '1rem',
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              outline: 'none',
              transition: 'border-color 0.2s',
              background: 'white',
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>
      </div>

      {/* Filters Row */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {/* Price Filter */}
          <select
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value)}
            style={{
              padding: '10px 16px',
              fontSize: '0.875rem',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              background: 'white',
              cursor: 'pointer',
              outline: 'none',
              color: '#1e293b',
            }}
          >
            <option value="all">ราคาทั้งหมด</option>
            <option value="free">ฟรี</option>
            <option value="paid">มีค่าใช้จ่าย</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '10px 16px',
              fontSize: '0.875rem',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              background: 'white',
              cursor: 'pointer',
              outline: 'none',
              color: '#1e293b',
            }}
          >
            <option value="newest">ใหม่ล่าสุด</option>
            <option value="oldest">เก่าที่สุด</option>
            <option value="price-low">ราคาต่ำ-สูง</option>
            <option value="price-high">ราคาสูง-ต่ำ</option>
          </select>

          {/* Clear Filters */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              style={{
                padding: '10px 16px',
                fontSize: '0.875rem',
                background: '#fee2e2',
                color: '#dc2626',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
              ล้างตัวกรอง
            </button>
          )}
        </div>

        {/* Results Count */}
        <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
          พบ <strong style={{ color: '#1e293b' }}>{totalCourses}</strong> คอร์ส
        </div>
      </div>
    </div>
  );
}

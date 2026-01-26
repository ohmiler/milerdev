'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CourseCard from '@/components/course/CourseCard';

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  price: string;
  instructor: { id: string; name: string | null; avatarUrl: string | null } | null;
  lessonCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function CoursesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [priceFilter, setPriceFilter] = useState(searchParams.get('price') || 'all');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        search,
        price: priceFilter,
        sort,
      });
      
      const res = await fetch(`/api/courses?${params}`);
      const data = await res.json();
      
      setCourses(data.courses || []);
      setPagination(data.pagination || null);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, priceFilter, sort]);

  useEffect(() => {
    // Update URL params
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (priceFilter !== 'all') params.set('price', priceFilter);
    if (sort !== 'newest') params.set('sort', sort);
    if (currentPage > 1) params.set('page', currentPage.toString());
    
    const queryString = params.toString();
    router.replace(queryString ? `?${queryString}` : '/courses', { scroll: false });
  }, [currentPage, priceFilter, sort, search, router]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchCourses();
  };

  return (
    <>
      <Navbar />

      <main style={{ paddingTop: '64px' }}>
        {/* Header */}
        <section style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #eff6ff 100%)',
          padding: '60px 0',
        }}>
          <div className="container">
            <h1 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 700,
              color: '#1e293b',
              marginBottom: '16px',
            }}>
              คอร์สทั้งหมด
            </h1>
            <p style={{ color: '#64748b', fontSize: '1.125rem' }}>
              เลือกคอร์สที่ใช่สำหรับคุณ และเริ่มต้นเส้นทางสู่การเป็น Developer มืออาชีพ
            </p>
          </div>
        </section>

        {/* Courses Grid */}
        <section className="section">
          <div className="container">
            {/* Filters */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '32px',
              padding: '20px',
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
                {/* Search */}
                <div style={{ position: 'relative', minWidth: '200px', flex: 1, maxWidth: '300px' }}>
                  <input
                    type="text"
                    placeholder="ค้นหาคอร์ส..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                {/* Price Filter */}
                <select
                  value={priceFilter}
                  onChange={(e) => { setPriceFilter(e.target.value); setCurrentPage(1); }}
                  style={{
                    padding: '10px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    background: 'white',
                    fontSize: '0.875rem',
                  }}
                >
                  <option value="all">ทุกราคา</option>
                  <option value="free">ฟรี</option>
                  <option value="paid">มีค่าใช้จ่าย</option>
                </select>

                {/* Sort */}
                <select
                  value={sort}
                  onChange={(e) => { setSort(e.target.value); setCurrentPage(1); }}
                  style={{
                    padding: '10px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    background: 'white',
                    fontSize: '0.875rem',
                  }}
                >
                  <option value="newest">ใหม่ล่าสุด</option>
                  <option value="oldest">เก่าสุด</option>
                  <option value="price-low">ราคาต่ำ-สูง</option>
                  <option value="price-high">ราคาสูง-ต่ำ</option>
                </select>

                <button
                  onClick={handleSearch}
                  style={{
                    padding: '10px 20px',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  ค้นหา
                </button>
              </div>

              <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
                {pagination ? `พบ ${pagination.total} คอร์ส` : '...'}
              </div>
            </div>

            {/* Loading */}
            {loading ? (
              <div style={{
                textAlign: 'center',
                padding: '80px 20px',
                color: '#64748b',
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid #e2e8f0',
                  borderTopColor: '#2563eb',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px',
                }} />
                <p>กำลังโหลดคอร์ส...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : courses.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '80px 20px',
                color: '#64748b',
              }}>
                <svg style={{ width: '64px', height: '64px', margin: '0 auto 16px', color: '#cbd5e1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px', color: '#1e293b' }}>
                  ไม่พบคอร์ส
                </h3>
                <p>ลองเปลี่ยนเงื่อนไขการค้นหา หรือกลับมาใหม่ภายหลัง</p>
              </div>
            ) : (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '24px',
                }}>
                  {courses.map((course) => (
                    <CourseCard
                      key={course.id}
                      id={course.id}
                      title={course.title}
                      slug={course.slug}
                      description={course.description}
                      thumbnailUrl={course.thumbnailUrl}
                      price={parseFloat(course.price || '0')}
                      instructorName={course.instructor?.name || null}
                      lessonCount={course.lessonCount}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '48px',
                  }}>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: '10px 20px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        background: 'white',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        opacity: currentPage === 1 ? 0.5 : 1,
                        fontWeight: 500,
                      }}
                    >
                      ← ก่อนหน้า
                    </button>
                    
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            style={{
                              width: '40px',
                              height: '40px',
                              border: currentPage === pageNum ? 'none' : '1px solid #e2e8f0',
                              borderRadius: '8px',
                              background: currentPage === pageNum ? '#2563eb' : 'white',
                              color: currentPage === pageNum ? 'white' : '#64748b',
                              cursor: 'pointer',
                              fontWeight: 500,
                            }}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                      disabled={currentPage === pagination.totalPages}
                      style={{
                        padding: '10px 20px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        background: 'white',
                        cursor: currentPage === pagination.totalPages ? 'not-allowed' : 'pointer',
                        opacity: currentPage === pagination.totalPages ? 0.5 : 1,
                        fontWeight: 500,
                      }}
                    >
                      ถัดไป →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

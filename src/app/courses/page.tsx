import { Suspense } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CourseCard from '@/components/course/CourseCard';
import CourseFilters from '@/components/course/CourseFilters';
import { db } from '@/lib/db';
import { courses, lessons, users } from '@/lib/db/schema';
import { eq, desc, asc, count, like, and, gt, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface SearchParams {
  search?: string;
  price?: string;
  sort?: string;
}

async function getCourses(searchParams: SearchParams) {
  const { search, price, sort } = searchParams;
  
  // Get published courses
  let allCourses = await db
    .select()
    .from(courses)
    .where(eq(courses.status, 'published'))
    .orderBy(desc(courses.createdAt));

  // Get lesson counts and instructor for each course
  let result = [];
  for (const course of allCourses) {
    const [lessonCount] = await db
      .select({ count: count() })
      .from(lessons)
      .where(eq(lessons.courseId, course.id));

    // Get instructor if exists
    let instructor = null;
    if (course.instructorId) {
      const instructorData = await db.query.users.findFirst({
        where: eq(users.id, course.instructorId),
        columns: { id: true, name: true },
      });
      instructor = instructorData || null;
    }

    result.push({
      ...course,
      instructor,
      lessonCount: lessonCount?.count || 0,
    });
  }

  // Apply search filter
  if (search) {
    const searchLower = search.toLowerCase();
    result = result.filter(course => 
      course.title.toLowerCase().includes(searchLower) ||
      (course.description?.toLowerCase().includes(searchLower))
    );
  }

  // Apply price filter
  if (price === 'free') {
    result = result.filter(course => parseFloat(course.price || '0') === 0);
  } else if (price === 'paid') {
    result = result.filter(course => parseFloat(course.price || '0') > 0);
  }

  // Apply sorting
  if (sort === 'oldest') {
    result.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
  } else if (sort === 'price-low') {
    result.sort((a, b) => parseFloat(a.price || '0') - parseFloat(b.price || '0'));
  } else if (sort === 'price-high') {
    result.sort((a, b) => parseFloat(b.price || '0') - parseFloat(a.price || '0'));
  }
  // Default is newest (already sorted by createdAt desc)

  return result;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

export default async function CoursesPage({ searchParams }: Props) {
  const params = await searchParams;
  const allCourses = await getCourses(params);

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
            <Suspense fallback={<div style={{ height: '100px' }} />}>
              <CourseFilters totalCourses={allCourses.length} />
            </Suspense>

            {allCourses.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '80px 20px',
                color: '#64748b',
              }}>
                <svg style={{ width: '64px', height: '64px', margin: '0 auto 16px', color: '#cbd5e1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px', color: '#1e293b' }}>
                  ยังไม่มีคอร์ส
                </h3>
                <p>กำลังเตรียมคอร์สใหม่ๆ ให้คุณ โปรดติดตาม!</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '24px',
              }}>
                {allCourses.map((course) => (
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
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

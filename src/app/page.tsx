import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CourseCard from '@/components/course/CourseCard';
import { db } from '@/lib/db';
import { courses, lessons, users } from '@/lib/db/schema';
import { eq, desc, count, sql } from 'drizzle-orm';

async function getFeaturedCourses() {
  // Subquery for lesson counts
  const lessonCountSq = db
    .select({
      courseId: lessons.courseId,
      lessonCount: count().as('lesson_count'),
    })
    .from(lessons)
    .groupBy(lessons.courseId)
    .as('lc');

  // Single query with LEFT JOIN for instructor + lesson count
  const rows = await db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      description: courses.description,
      thumbnailUrl: courses.thumbnailUrl,
      price: courses.price,
      status: courses.status,
      instructorId: courses.instructorId,
      createdAt: courses.createdAt,
      updatedAt: courses.updatedAt,
      instructorName: users.name,
      lessonCount: sql<number>`COALESCE(${lessonCountSq.lessonCount}, 0)`.as('lesson_count'),
    })
    .from(courses)
    .leftJoin(users, eq(courses.instructorId, users.id))
    .leftJoin(lessonCountSq, eq(courses.id, lessonCountSq.courseId))
    .where(eq(courses.status, 'published'))
    .orderBy(desc(courses.createdAt))
    .limit(6);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    thumbnailUrl: row.thumbnailUrl,
    price: row.price,
    status: row.status,
    instructorId: row.instructorId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    instructor: row.instructorId ? { id: row.instructorId, name: row.instructorName } : null,
    lessonCount: Number(row.lessonCount) || 0,
  }));
}

async function getStats() {
  // Use Promise.all() to parallelize independent queries (async-parallel rule)
  const [userCountResult, lessonCountResult, courseCountResult] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(lessons),
    db.select({ count: count() }).from(courses).where(eq(courses.status, 'published')),
  ]);
  
  return {
    users: userCountResult[0]?.count || 0,
    lessons: lessonCountResult[0]?.count || 0,
    courses: courseCountResult[0]?.count || 0,
  };
}

export default async function HomePage() {
  // Parallelize independent data fetching (async-parallel rule)
  const [featuredCourses, stats] = await Promise.all([
    getFeaturedCourses(),
    getStats(),
  ]);

  return (
    <>
      <Navbar />

      <main style={{ paddingTop: '64px' }}>
        {/* Hero Section */}
        <section style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #eff6ff 100%)',
          padding: '80px 0 100px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background decoration */}
          <div style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-150px',
            left: '-100px',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />

          <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <div style={{ maxWidth: '720px', margin: '0 auto' }}>
              {/* Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #dbeafe, #eff6ff)',
                color: '#2563eb',
                padding: '10px 20px',
                borderRadius: '50px',
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '24px',
                border: '1px solid #bfdbfe'
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  background: '#3b82f6',
                  borderRadius: '50%',
                  animation: 'pulse 2s infinite'
                }} />
                🚀 เริ่มเรียนได้ทันที
              </div>

              {/* Hero Title */}
              <h1 className="hero-title" style={{ marginBottom: '24px' }}>
                เรียน Coding{' '}
                <span className="highlight">ออนไลน์</span>
                <br />
                กับ MilerDev
              </h1>

              <p style={{
                fontSize: '1.25rem',
                color: '#64748b',
                marginBottom: '32px',
                lineHeight: 1.8,
              }}>
                พัฒนาทักษะการเขียนโปรแกรมของคุณด้วยคอร์สคุณภาพสูง
                เรียนรู้จากโปรเจกต์จริง และก้าวสู่การเป็น Developer มืออาชีพ
              </p>

              {/* CTA Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '48px', justifyContent: 'center' }}>
                <Link href="/courses" className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '16px 32px' }}>
                  <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  เริ่มเรียนเลย
                </Link>
                <Link href="/courses" className="btn btn-secondary" style={{ fontSize: '1.1rem', padding: '16px 32px' }}>
                  ดูคอร์สทั้งหมด
                </Link>
              </div>

              {/* Stats */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '40px',
                paddingTop: '32px',
                borderTop: '1px solid #e2e8f0',
                justifyContent: 'center'
              }}>
                <div className="stat-item" style={{ textAlign: 'left', padding: 0 }}>
                  <div className="stat-value">{stats.users.toLocaleString()}+</div>
                  <div className="stat-label">นักเรียน</div>
                </div>
                <div className="stat-item" style={{ textAlign: 'left', padding: 0 }}>
                  <div className="stat-value">{stats.lessons}+</div>
                  <div className="stat-label">บทเรียน</div>
                </div>
                <div className="stat-item" style={{ textAlign: 'left', padding: 0 }}>
                  <div className="stat-value">{stats.courses}</div>
                  <div className="stat-label">คอร์ส</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="section" style={{ background: 'white' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: '64px' }}>
              <h2 className="section-title" style={{ marginBottom: '16px' }}>
                ทำไมต้องเรียนกับเรา?
              </h2>
              <p style={{ color: '#64748b', fontSize: '1.125rem', maxWidth: '600px', margin: '0 auto' }}>
                เราออกแบบคอร์สเรียนให้เข้าใจง่าย เน้นปฏิบัติจริง และสามารถนำไปใช้งานได้ทันที
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '32px'
            }}>
              {/* Feature 1 */}
              <div style={{ textAlign: 'center', padding: '32px 24px' }}>
                <div className="feature-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
                  เนื้อหาอัพเดทล่าสุด
                </h3>
                <p style={{ color: '#64748b', lineHeight: 1.7 }}>
                  เนื้อหาถูกอัพเดทตลอดเวลาให้ทันกับเทคโนโลยีใหม่ๆ
                </p>
              </div>

              {/* Feature 2 */}
              <div style={{ textAlign: 'center', padding: '32px 24px' }}>
                <div className="feature-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
                  เรียนรู้จากโปรเจกต์จริง
                </h3>
                <p style={{ color: '#64748b', lineHeight: 1.7 }}>
                  ฝึกทำโปรเจกต์จริงที่สามารถใส่ Portfolio ได้เลย
                </p>
              </div>

              {/* Feature 3 */}
              <div style={{ textAlign: 'center', padding: '32px 24px' }}>
                <div className="feature-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
                  Community ที่แข็งแกร่ง
                </h3>
                <p style={{ color: '#64748b', lineHeight: 1.7 }}>
                  ร่วมกลุ่มกับนักเรียนคนอื่นๆ แลกเปลี่ยนความรู้และประสบการณ์
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Courses Section */}
        <section className="section" style={{ background: '#f8fafc' }}>
          <div className="container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '48px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 className="section-title" style={{ marginBottom: '8px' }}>
                  คอร์สยอดนิยม
                </h2>
                <p style={{ color: '#64748b' }}>คอร์สที่ได้รับความนิยมสูงสุดจากนักเรียน</p>
              </div>
              <Link href="/courses" className="btn btn-secondary">
                ดูทั้งหมด
                <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '24px'
            }}>
              {featuredCourses.map((course) => (
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
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section" style={{ padding: '100px 0' }}>
          <div className="container" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <h2 style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 700,
              color: 'white',
              marginBottom: '16px',
              lineHeight: 1.3
            }}>
              พร้อมที่จะเริ่มต้นเรียนหรือยัง?
            </h2>
            <p style={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: '1.125rem',
              marginBottom: '32px',
              maxWidth: '600px',
              margin: '0 auto 32px'
            }}>
              สมัครสมาชิกฟรีวันนี้ และเริ่มต้นเส้นทางสู่การเป็น Developer มืออาชีพ
            </p>
            <Link
              href="/register"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                background: 'white',
                color: '#2563eb',
                fontWeight: 600,
                fontSize: '1.125rem',
                padding: '18px 36px',
                borderRadius: '12px',
                textDecoration: 'none',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.3s ease'
              }}
            >
              สมัครสมาชิกฟรี
              <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

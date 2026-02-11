import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CourseCard from '@/components/course/CourseCard';
import { db } from '@/lib/db';
import { courses, lessons, users, bundles, bundleCourses } from '@/lib/db/schema';
import { eq, desc, asc, count, sql } from 'drizzle-orm';

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
      promoPrice: courses.promoPrice,
      promoStartsAt: courses.promoStartsAt,
      promoEndsAt: courses.promoEndsAt,
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

  const now = new Date();
  return rows.map((row) => {
    const hasPromo = row.promoPrice !== null && row.promoPrice !== undefined;
    const promoStartOk = !row.promoStartsAt || new Date(row.promoStartsAt) <= now;
    const promoEndOk = !row.promoEndsAt || new Date(row.promoEndsAt) >= now;
    const isPromoActive = hasPromo && promoStartOk && promoEndOk;

    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      thumbnailUrl: row.thumbnailUrl,
      price: row.price,
      promoPrice: row.promoPrice,
      isPromoActive,
      status: row.status,
      instructorId: row.instructorId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      instructor: row.instructorId ? { id: row.instructorId, name: row.instructorName } : null,
      lessonCount: Number(row.lessonCount) || 0,
    };
  });
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

async function getPublishedBundles() {
  const allBundles = await db
    .select()
    .from(bundles)
    .where(eq(bundles.status, 'published'))
    .orderBy(desc(bundles.createdAt))
    .limit(3);

  return Promise.all(
    allBundles.map(async (bundle) => {
      const bCourses = await db
        .select({
          courseId: bundleCourses.courseId,
          courseTitle: courses.title,
          coursePrice: courses.price,
        })
        .from(bundleCourses)
        .innerJoin(courses, eq(bundleCourses.courseId, courses.id))
        .where(eq(bundleCourses.bundleId, bundle.id))
        .orderBy(asc(bundleCourses.orderIndex));

      const totalOriginalPrice = bCourses.reduce(
        (sum, c) => sum + parseFloat(c.coursePrice || '0'), 0
      );

      return {
        ...bundle,
        courses: bCourses,
        courseCount: bCourses.length,
        totalOriginalPrice,
        discount: totalOriginalPrice > 0
          ? Math.round((1 - parseFloat(bundle.price) / totalOriginalPrice) * 100)
          : 0,
      };
    })
  );
}

export default async function HomePage() {
  // Parallelize independent data fetching (async-parallel rule)
  const [featuredCourses, stats, publishedBundles] = await Promise.all([
    getFeaturedCourses(),
    getStats(),
    getPublishedBundles(),
  ]);

  return (
    <>
      <Navbar />

      <main style={{ paddingTop: '0' }}>
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
                  promoPrice={course.promoPrice ? parseFloat(course.promoPrice) : null}
                  isPromoActive={course.isPromoActive}
                  instructorName={course.instructor?.name || null}
                  lessonCount={course.lessonCount}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Bundle Section — Gift Theme */}
        {publishedBundles.length > 0 && (
          <section className="bundle-gift-section">
            {/* Floating particles */}
            <div className="bundle-particles">
              <span className="particle p1"></span>
              <span className="particle p2"></span>
              <span className="particle p3"></span>
              <span className="particle p4"></span>
              <span className="particle p5"></span>
              <span className="particle p6"></span>
              <span className="particle p7"></span>
              <span className="particle p8"></span>
            </div>

            <div className="container" style={{ position: 'relative', zIndex: 2 }}>
              {/* Header with gift icon */}
              <div style={{ textAlign: 'center', marginBottom: '48px', color: 'white' }}>
                <div className="gift-icon-wrapper">
                  <svg className="gift-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 12 20 22 4 22 4 12"/>
                    <rect x="2" y="7" width="20" height="5"/>
                    <line x1="12" y1="22" x2="12" y2="7"/>
                    <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/>
                    <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
                  </svg>
                </div>

                <h2 style={{
                  fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
                  fontWeight: 800,
                  marginBottom: '8px',
                  letterSpacing: '-0.02em',
                }}>
                  <span className="shimmer-text">ของขวัญสุดพิเศษ</span>
                </h2>
                <p style={{ opacity: 0.85, fontSize: '1.0625rem', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
                  รวมคอร์สชุดพิเศษในราคาที่คุ้มค่ากว่าซื้อแยก
                </p>
              </div>

              {/* Bundle Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '24px',
                maxWidth: '960px',
                margin: '0 auto',
              }}>
                {publishedBundles.map((bundle, idx) => {
                  const bundlePrice = parseFloat(bundle.price);
                  return (
                    <Link key={bundle.id} href={`/bundles/${bundle.slug}`} style={{ textDecoration: 'none' }}>
                      <div className={`bundle-gift-card bundle-gift-card-${idx}`}>
                        {/* Ribbon */}
                        <div className="bundle-ribbon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 12 20 22 4 22 4 12"/>
                            <rect x="2" y="7" width="20" height="5"/>
                            <line x1="12" y1="22" x2="12" y2="7"/>
                            <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/>
                            <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
                          </svg>
                          <span>{bundle.courseCount} คอร์ส</span>
                        </div>

                        {/* Discount badge */}
                        {bundle.discount > 0 && (
                          <div className="bundle-discount-badge">
                            <span className="bundle-discount-value">-{bundle.discount}%</span>
                          </div>
                        )}

                        {/* Card content */}
                        <div style={{ padding: '32px 24px 24px' }}>
                          <h3 style={{
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            margin: '0 0 10px',
                            lineHeight: 1.3,
                            color: 'white',
                          }}>
                            {bundle.title}
                          </h3>

                          {bundle.description && (
                            <p style={{ fontSize: '0.875rem', opacity: 0.75, margin: '0 0 16px', lineHeight: 1.5, color: 'white' }}>
                              {bundle.description.slice(0, 80)}{bundle.description.length > 80 ? '...' : ''}
                            </p>
                          )}

                          {/* Course pills */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                            {bundle.courses.slice(0, 3).map((c, i) => (
                              <span key={i} className="bundle-course-pill">
                                {c.courseTitle}
                              </span>
                            ))}
                            {bundle.courses.length > 3 && (
                              <span style={{ fontSize: '0.75rem', opacity: 0.55, color: 'white', alignSelf: 'center' }}>
                                +{bundle.courses.length - 3} อีก
                              </span>
                            )}
                          </div>

                          {/* Price row */}
                          <div className="bundle-price-row">
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                              <span style={{ fontSize: '1.625rem', fontWeight: 800, color: 'white' }}>
                                ฿{bundlePrice.toLocaleString()}
                              </span>
                              <span style={{ textDecoration: 'line-through', opacity: 0.45, fontSize: '0.9375rem', color: 'white' }}>
                                ฿{bundle.totalOriginalPrice.toLocaleString()}
                              </span>
                            </div>
                            <span className="bundle-cta-arrow">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12"/>
                                <polyline points="12 5 19 12 12 19"/>
                              </svg>
                            </span>
                          </div>
                        </div>

                        {/* Bottom shimmer line */}
                        <div className="bundle-card-shimmer"></div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <style>{`
              .bundle-gift-section {
                padding: 100px 0;
                background: linear-gradient(135deg, #0f0a2e 0%, #1a1145 30%, #2d1b69 60%, #1a1145 100%);
                position: relative;
                overflow: hidden;
              }

              /* Floating sparkle particles */
              .bundle-particles {
                position: absolute;
                inset: 0;
                pointer-events: none;
                z-index: 1;
              }
              .particle {
                position: absolute;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(251,191,36,0.8), transparent 70%);
                animation: particleFloat 6s ease-in-out infinite;
              }
              .p1 { width: 4px; height: 4px; top: 15%; left: 10%; animation-delay: 0s; animation-duration: 7s; }
              .p2 { width: 3px; height: 3px; top: 25%; left: 85%; animation-delay: 1s; animation-duration: 5s; }
              .p3 { width: 5px; height: 5px; top: 60%; left: 20%; animation-delay: 2s; animation-duration: 8s; }
              .p4 { width: 3px; height: 3px; top: 80%; left: 75%; animation-delay: 0.5s; animation-duration: 6s; }
              .p5 { width: 4px; height: 4px; top: 40%; left: 50%; animation-delay: 3s; animation-duration: 7s; }
              .p6 { width: 3px; height: 3px; top: 10%; left: 65%; animation-delay: 1.5s; animation-duration: 5.5s; }
              .p7 { width: 5px; height: 5px; top: 70%; left: 40%; animation-delay: 4s; animation-duration: 6.5s; }
              .p8 { width: 3px; height: 3px; top: 50%; left: 90%; animation-delay: 2.5s; animation-duration: 7.5s; }

              @keyframes particleFloat {
                0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
                50% { transform: translateY(-30px) scale(1.5); opacity: 1; }
              }

              /* Gift icon */
              .gift-icon-wrapper {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.05));
                border: 1px solid rgba(251,191,36,0.25);
                margin-bottom: 20px;
                animation: giftPulse 3s ease-in-out infinite;
              }
              .gift-icon {
                color: #fbbf24;
                animation: giftBounce 2s ease-in-out infinite;
              }

              @keyframes giftPulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(251,191,36,0.2); }
                50% { box-shadow: 0 0 30px 10px rgba(251,191,36,0.15); }
              }
              @keyframes giftBounce {
                0%, 100% { transform: translateY(0) rotate(0deg); }
                25% { transform: translateY(-3px) rotate(-3deg); }
                75% { transform: translateY(-3px) rotate(3deg); }
              }

              /* Shimmer text */
              .shimmer-text {
                background: linear-gradient(
                  120deg,
                  #ffffff 0%,
                  #fbbf24 25%,
                  #ffffff 50%,
                  #fbbf24 75%,
                  #ffffff 100%
                );
                background-size: 200% 100%;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                animation: shimmer 4s linear infinite;
              }
              @keyframes shimmer {
                0% { background-position: 200% center; }
                100% { background-position: -200% center; }
              }

              /* Bundle Card */
              .bundle-gift-card {
                position: relative;
                border-radius: 20px;
                overflow: hidden;
                height: 100%;
                cursor: pointer;
                transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.35s ease;
                background: linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
                border: 1px solid rgba(251,191,36,0.15);
              }
              .bundle-gift-card:hover {
                transform: translateY(-8px);
                box-shadow: 0 20px 60px rgba(251,191,36,0.15), 0 0 40px rgba(124,58,237,0.2);
              }
              .bundle-gift-card:hover .bundle-cta-arrow {
                transform: translateX(4px);
                opacity: 1;
              }
              .bundle-gift-card:hover .bundle-card-shimmer {
                opacity: 1;
              }
              .bundle-gift-card:hover .bundle-ribbon {
                background: rgba(251,191,36,0.25);
              }

              /* Ribbon tag */
              .bundle-ribbon {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 6px 14px;
                margin: 20px 0 0 20px;
                background: rgba(251,191,36,0.12);
                border: 1px solid rgba(251,191,36,0.2);
                border-radius: 50px;
                color: #fbbf24;
                font-size: 0.8125rem;
                font-weight: 600;
                transition: background 0.3s;
              }
              .bundle-ribbon svg { width: 14px; height: 14px; }

              /* Discount badge */
              .bundle-discount-badge {
                position: absolute;
                top: 16px;
                right: 16px;
                width: 52px;
                height: 52px;
                border-radius: 50%;
                background: linear-gradient(135deg, #ef4444, #dc2626);
                display: flex;
                align-items: center;
                justify-content: center;
                animation: badgePop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) both;
                box-shadow: 0 4px 15px rgba(239,68,68,0.4);
              }
              .bundle-discount-value {
                color: white;
                font-size: 0.8125rem;
                font-weight: 800;
              }
              @keyframes badgePop {
                0% { transform: scale(0) rotate(-20deg); }
                100% { transform: scale(1) rotate(0deg); }
              }

              /* Course pills */
              .bundle-course-pill {
                background: rgba(251,191,36,0.08);
                border: 1px solid rgba(251,191,36,0.15);
                padding: 4px 12px;
                border-radius: 50px;
                font-size: 0.75rem;
                color: rgba(255,255,255,0.8);
                transition: background 0.2s;
              }
              .bundle-gift-card:hover .bundle-course-pill {
                background: rgba(251,191,36,0.15);
              }

              /* Price row */
              .bundle-price-row {
                border-top: 1px solid rgba(251,191,36,0.12);
                padding-top: 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
              }

              /* CTA arrow */
              .bundle-cta-arrow {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: linear-gradient(135deg, #fbbf24, #f59e0b);
                display: flex;
                align-items: center;
                justify-content: center;
                color: #1e1b4b;
                opacity: 0.7;
                transition: transform 0.3s, opacity 0.3s;
                flex-shrink: 0;
              }

              /* Bottom shimmer line */
              .bundle-card-shimmer {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: linear-gradient(90deg, transparent, #fbbf24, transparent);
                opacity: 0;
                transition: opacity 0.4s;
                animation: shimmerSlide 2s linear infinite;
              }
              @keyframes shimmerSlide {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
              }

              /* Stagger entrance for cards */
              .bundle-gift-card-0 { animation: cardEntrance 0.6s ease-out both; }
              .bundle-gift-card-1 { animation: cardEntrance 0.6s ease-out 0.15s both; }
              .bundle-gift-card-2 { animation: cardEntrance 0.6s ease-out 0.3s both; }
              @keyframes cardEntrance {
                0% { opacity: 0; transform: translateY(30px) scale(0.95); }
                100% { opacity: 1; transform: translateY(0) scale(1); }
              }
            `}</style>
          </section>
        )}

        {/* Client Showcase Section */}
        <section style={{
          padding: '80px 0',
          background: '#f8fafc',
          overflow: 'hidden',
        }}>
          <div className="container" style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{
              fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
              fontWeight: 700,
              color: '#1e293b',
              marginBottom: '12px',
              lineHeight: 1.3,
            }}>
              ส่วนหนึ่งขององค์กรที่ไว้วางใจ MilerDev และเคยร่วมงาน
            </h2>
            <p style={{
              color: '#64748b',
              fontSize: '1rem',
              maxWidth: '640px',
              margin: '0 auto',
            }}>
              องค์กรที่ MilerDev ได้รับความไว้วางใจให้ทำหน้าที่เป็น วิทยากรอบรมและให้ความรู้การเขียนโปรแกรม
            </p>
          </div>

          <div className="marquee-wrapper">
            <div className="marquee-inner">
              {[0, 1].map((copy) => (
                <div key={copy} className="marquee-track" aria-hidden={copy === 1}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8].map((num, i) => (
                    <div key={i} className="marquee-item">
                      <img
                        src={`/clients/0${num}-clients.png`}
                        alt={`Client ${num}`}
                        className="marquee-logo"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <style>{`
            .marquee-wrapper {
              width: 100%;
              overflow: hidden;
              mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
              -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
            }
            .marquee-inner {
              display: flex;
              width: max-content;
              animation: marquee 100s linear infinite;
            }
            .marquee-track {
              display: flex;
              align-items: center;
              flex-shrink: 0;
            }
            .marquee-item {
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 0 30px;
            }
            .marquee-logo {
              max-height: 64px;
              max-width: 160px;
              object-fit: contain;
              filter: grayscale(30%);
              opacity: 0.85;
              transition: all 0.3s;
            }
            .marquee-logo:hover {
              filter: grayscale(0%);
              opacity: 1;
            }
            @keyframes marquee {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .marquee-wrapper:hover .marquee-inner {
              animation-play-state: paused;
            }
          `}</style>
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

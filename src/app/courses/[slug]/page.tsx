import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CourseDetailClient, { CourseDetailProvider } from '@/components/course/CourseDetailClient';
import { db } from '@/lib/db';
import { courses, lessons, users } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { getExcerpt } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [course] = await db
    .select({ title: courses.title, description: courses.description, thumbnailUrl: courses.thumbnailUrl })
    .from(courses)
    .where(eq(courses.slug, slug))
    .limit(1);

  if (!course) {
    return { title: 'ไม่พบคอร์ส' };
  }

  const description = course.description ? getExcerpt(course.description, 160) : 'เรียนออนไลน์กับ MilerDev';

  return {
    title: course.title,
    description,
    openGraph: {
      title: course.title,
      description,
      ...(course.thumbnailUrl && { images: [course.thumbnailUrl] }),
    },
  };
}

async function getCourse(slug: string) {
  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.slug, slug))
    .limit(1);

  if (!course) return null;

  // Parallelize instructor and lessons queries
  const [instructorResult, courseLessons] = await Promise.all([
    course.instructorId
      ? db
          .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
          .from(users)
          .where(eq(users.id, course.instructorId))
          .limit(1)
      : Promise.resolve([]),
    db
      .select()
      .from(lessons)
      .where(eq(lessons.courseId, course.id))
      .orderBy(asc(lessons.orderIndex)),
  ]);

  return {
    ...course,
    instructor: instructorResult[0] || null,
    lessons: courseLessons,
  };
}

function CheckIcon() {
  return (
    <svg style={{ width: '20px', height: '20px', color: '#16a34a', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const course = await getCourse(slug);

  if (!course) {
    notFound();
  }

  const price = parseFloat(course.price || '0');

  return (
    <>
      <Navbar />

      <main style={{ paddingTop: '64px' }}>
        {/* Course Header */}
        <section style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
          padding: '60px 0',
          color: 'white',
        }}>
          <div className="container">
            <div style={{ maxWidth: '800px' }}>
              {/* Breadcrumb */}
              <div style={{ marginBottom: '24px', fontSize: '0.875rem', opacity: 0.8 }}>
                <Link href="/" style={{ color: 'white', textDecoration: 'none' }}>หน้าแรก</Link>
                {' / '}
                <Link href="/courses" style={{ color: 'white', textDecoration: 'none' }}>คอร์สทั้งหมด</Link>
                {' / '}
                <span>{course.title}</span>
              </div>

              <h1 style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                fontWeight: 700,
                marginBottom: '16px',
                lineHeight: 1.3,
              }}>
                {course.title}
              </h1>

              {course.description && (
                <p style={{
                  fontSize: '1.125rem',
                  opacity: 0.9,
                  marginBottom: '24px',
                  lineHeight: 1.7,
                }}>
                  {getExcerpt(course.description, 200)}
                </p>
              )}

              {/* Meta */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
                {course.instructor?.name && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <span style={{ fontWeight: 600 }}>{course.instructor.name.charAt(0)}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>ผู้สอน</div>
                      <div style={{ fontWeight: 500 }}>{course.instructor.name}</div>
                    </div>
                  </div>
                )}

                <div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>บทเรียน</div>
                  <div style={{ fontWeight: 500 }}>{course.lessons.length} บท</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Course Content */}
        <section className="section">
          <div className="container">
            <CourseDetailProvider>
            <div className="course-detail-grid">
              {/* Left - Lessons */}
              <div className="course-detail-main">
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  marginBottom: '24px',
                  color: '#1e293b',
                }}>
                  เนื้อหาคอร์ส
                </h2>

                <CourseDetailClient
                  courseId={course.id}
                  courseSlug={course.slug}
                  lessons={course.lessons}
                />
              </div>

              {/* Right - Enrollment Card */}
              <div className="course-detail-sidebar">
                <div style={{
                  background: 'white',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                  overflow: 'hidden',
                  position: 'sticky',
                  top: '80px',
                }}>
                  {/* Thumbnail */}
                  <div style={{
                    position: 'relative',
                    paddingTop: '56.25%',
                    background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
                  }}>
                    {course.thumbnailUrl ? (
                      <Image
                        src={course.thumbnailUrl}
                        alt={course.title}
                        fill
                        sizes="(max-width: 1024px) 100vw, 400px"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <svg style={{ width: '48px', height: '48px', color: 'rgba(255,255,255,0.6)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}

                    {/* Price Badge */}
                    <span style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      padding: '6px 14px',
                      borderRadius: '50px',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      ...(price === 0
                        ? { background: '#dcfce7', color: '#16a34a' }
                        : { background: '#fef3c7', color: '#b45309' }),
                    }}>
                      {price === 0 ? 'ฟรี' : `฿${price.toLocaleString()}`}
                    </span>
                  </div>

                  <div style={{ padding: '24px' }}>
                    {/* Price Display */}
                    <div style={{ marginBottom: '20px' }}>
                      {price === 0 ? (
                        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#16a34a' }}>ฟรี</div>
                      ) : (
                        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>฿{price.toLocaleString()}</div>
                      )}
                    </div>

                    {/* CTA Button — rendered by CourseDetailClient */}
                    <div id="enroll-button-slot">
                      <CourseDetailClient
                        courseId={course.id}
                        courseSlug={course.slug}
                        price={price}
                        renderMode="button"
                      />
                    </div>

                    {/* Features */}
                    <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9375rem', color: '#64748b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <CheckIcon />
                          เข้าถึงได้ตลอดชีพ
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <CheckIcon />
                          เรียนได้ทุกอุปกรณ์
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <CheckIcon />
                          Certificate เมื่อเรียนจบ
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </CourseDetailProvider>
          </div>
        </section>
      </main>

      <Footer />

      <style>{`
        .course-detail-grid {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
        .course-detail-main {
          order: 2;
        }
        .course-detail-sidebar {
          order: 1;
        }

        @media (min-width: 1024px) {
          .course-detail-grid {
            display: grid;
            grid-template-columns: 1fr 360px;
            gap: 48px;
          }
          .course-detail-main {
            order: 1;
          }
          .course-detail-sidebar {
            order: 2;
          }
        }
      `}</style>
    </>
  );
}

import { notFound } from 'next/navigation';
import Link from 'next/link';
// Image import removed - using native img for external URLs
import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CourseDetailClient, { CourseDetailProvider } from '@/components/course/CourseDetailClient';
import CourseReviewsWrapper from '@/components/course/CourseReviewsWrapper';
import { db } from '@/lib/db';
import { courses, lessons, users, courseTags, tags } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { getExcerpt, sanitizeRichContent } from '@/lib/sanitize';

function normalizeUrl(url: string | null): string | null {
    if (!url || url.trim() === '') return null;
    if (url.startsWith('http')) return url;
    return `https://${url}`;
}

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

  const thumbnailUrl = course.thumbnailUrl?.startsWith('http') ? course.thumbnailUrl : course.thumbnailUrl ? `https://${course.thumbnailUrl}` : null;

  return {
    title: course.title,
    description,
    openGraph: {
      type: 'website',
      title: course.title,
      description,
      url: `/courses/${slug}`,
      siteName: 'MilerDev',
      ...(thumbnailUrl && {
        images: [{
          url: thumbnailUrl,
          width: 1200,
          height: 630,
          alt: course.title,
        }],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: course.title,
      description,
      ...(thumbnailUrl && { images: [thumbnailUrl] }),
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

  // Parallelize instructor, lessons, and tags queries
  const [instructorResult, courseLessons, courseTagRows] = await Promise.all([
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
    db
      .select({ id: tags.id, name: tags.name, slug: tags.slug })
      .from(courseTags)
      .innerJoin(tags, eq(courseTags.tagId, tags.id))
      .where(eq(courseTags.courseId, course.id)),
  ]);

  return {
    ...course,
    instructor: instructorResult[0] || null,
    lessons: courseLessons,
    tags: courseTagRows,
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
  const now = new Date();
  const hasPromo = course.promoPrice !== null && course.promoPrice !== undefined;
  const promoStartOk = !course.promoStartsAt || new Date(course.promoStartsAt) <= now;
  const promoEndOk = !course.promoEndsAt || new Date(course.promoEndsAt) >= now;
  const isPromoActive = hasPromo && promoStartOk && promoEndOk;
  const promoPrice = isPromoActive ? parseFloat(course.promoPrice || '0') : null;
  const displayPrice = promoPrice !== null ? promoPrice : price;

  return (
    <>
      <Navbar />

      <main style={{ paddingTop: '0' }}>
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

              {course.tags && course.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                  {course.tags.map((tag: { id: string; name: string; slug: string }) => (
                    <Link
                      key={tag.id}
                      href={`/courses?tag=${tag.slug}`}
                      className="course-tag-badge"
                      style={{
                        padding: '4px 14px',
                        background: 'rgba(255,255,255,0.15)',
                        color: 'white',
                        borderRadius: '50px',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        textDecoration: 'none',
                      }}
                    >
                      {tag.name}
                    </Link>
                  ))}
                </div>
              )}

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
              {/* Left - Description + Lessons */}
              <div className="course-detail-main">
                {course.description && (
                  <div style={{ marginBottom: '40px' }}>
                    <h2 style={{
                      fontSize: '1.5rem',
                      fontWeight: 600,
                      marginBottom: '24px',
                      color: '#1e293b',
                    }}>
                      รายละเอียดคอร์ส
                    </h2>
                    <div
                      className="course-description-content"
                      dangerouslySetInnerHTML={{ __html: sanitizeRichContent(course.description) }}
                    />
                  </div>
                )}

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

                {/* Reviews Section */}
                <CourseReviewsWrapper courseSlug={course.slug} />
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
                    {normalizeUrl(course.thumbnailUrl) ? (
                      <img
                        src={normalizeUrl(course.thumbnailUrl)!}
                        alt={course.title}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      ...(displayPrice === 0
                        ? { background: '#dcfce7', color: '#16a34a' }
                        : isPromoActive
                          ? { background: '#fef2f2', color: '#dc2626' }
                          : { background: '#fef3c7', color: '#b45309' }),
                    }}>
                      {displayPrice === 0 ? 'ฟรี' : isPromoActive ? (
                        <>
                          <span style={{ textDecoration: 'line-through', opacity: 0.6, fontSize: '0.75rem' }}>฿{price.toLocaleString()}</span>
                          <span>฿{displayPrice.toLocaleString()}</span>
                        </>
                      ) : `฿${price.toLocaleString()}`}
                    </span>
                  </div>

                  <div style={{ padding: '24px' }}>
                    {/* Price Display */}
                    <div style={{ marginBottom: '20px' }}>
                      {displayPrice === 0 ? (
                        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#16a34a' }}>ฟรี</div>
                      ) : isPromoActive ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#dc2626' }}>฿{displayPrice.toLocaleString()}</span>
                            <span style={{ fontSize: '1.125rem', color: '#94a3b8', textDecoration: 'line-through' }}>฿{price.toLocaleString()}</span>
                          </div>
                          <div style={{ marginTop: '6px', fontSize: '0.8125rem', color: '#dc2626', fontWeight: 500 }}>
                            ลด {Math.round((1 - displayPrice / price) * 100)}%
                            {course.promoEndsAt && (
                              <span style={{ color: '#64748b', fontWeight: 400 }}>
                                {' '}ถึง {new Date(course.promoEndsAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>฿{price.toLocaleString()}</div>
                      )}
                    </div>

                    {/* CTA Button — rendered by CourseDetailClient */}
                    <div id="enroll-button-slot">
                      <CourseDetailClient
                        courseId={course.id}
                        courseSlug={course.slug}
                        price={displayPrice}
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

        .course-description-content {
          color: #334155;
          font-size: 1rem;
          line-height: 1.8;
        }
        .course-description-content h2 {
          font-size: 1.35rem;
          font-weight: 600;
          color: #1e293b;
          margin: 1.5em 0 0.75em;
        }
        .course-description-content h3 {
          font-size: 1.15rem;
          font-weight: 600;
          color: #1e293b;
          margin: 1.25em 0 0.5em;
        }
        .course-description-content p {
          margin: 0.75em 0;
        }
        .course-description-content ul {
          padding-left: 1.5em;
          margin: 0.75em 0;
          list-style-type: disc;
        }
        .course-description-content ol {
          padding-left: 1.5em;
          margin: 0.75em 0;
          list-style-type: decimal;
        }
        .course-description-content li {
          margin: 0.4em 0;
          display: list-item;
        }
        .course-description-content strong {
          font-weight: 600;
          color: #1e293b;
        }
        .course-description-content a {
          color: #2563eb;
          text-decoration: underline;
        }
        .course-description-content a:hover {
          color: #1d4ed8;
        }
        .course-description-content blockquote {
          border-left: 3px solid #3b82f6;
          padding-left: 16px;
          margin: 1em 0;
          color: #64748b;
          font-style: italic;
        }
        .course-description-content pre {
          background: #1e293b;
          color: #e2e8f0;
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 1em 0;
          font-family: 'Fira Code', monospace;
          font-size: 0.9em;
          line-height: 1.6;
        }
        .course-description-content code {
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.9em;
          color: #e11d48;
          font-family: 'Fira Code', monospace;
        }
        .course-description-content pre code {
          background: none;
          color: inherit;
          padding: 0;
          font-size: inherit;
        }
        .course-description-content hr {
          border: none;
          border-top: 1px solid #e2e8f0;
          margin: 1.5em 0;
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

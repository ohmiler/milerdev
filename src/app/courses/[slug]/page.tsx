import { notFound } from 'next/navigation';
import Link from 'next/link';
// Image import removed - using native img for external URLs
import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CourseDetailClient, { CourseDetailProvider } from '@/components/course/CourseDetailClient';
import CourseReviewsWrapper from '@/components/course/CourseReviewsWrapper';
import CoursePreviewVideo from '@/components/course/CoursePreviewVideo';
import { db } from '@/lib/db';
import { courses, lessons, users, courseTags, tags } from '@/lib/db/schema';
import { eq, asc, and } from 'drizzle-orm';
import { extractBunnyVideoInfo, generateSignedVideoUrl, isBunnyVideo } from '@/lib/bunny';
import { getExcerpt, getSanitizedRichContentCached } from '@/lib/sanitize';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://milerdev.com';

function normalizeUrl(url: string | null): string | null {
    if (!url || url.trim() === '') return null;
    if (url.startsWith('http')) return url;
    return `https://${url}`;
}

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [course] = await db
    .select({ title: courses.title, description: courses.description, thumbnailUrl: courses.thumbnailUrl })
    .from(courses)
    .where(and(eq(courses.slug, slug), eq(courses.status, 'published')))
    .limit(1);

  if (!course) {
    return { title: 'ไม่พบคอร์ส' };
  }

  const description = course.description ? getExcerpt(course.description, 160) : 'เรียนออนไลน์กับ MilerDev';

  const thumbnailUrl = course.thumbnailUrl?.startsWith('http') ? course.thumbnailUrl : course.thumbnailUrl ? `https://${course.thumbnailUrl}` : null;

  return {
    title: course.title,
    description,
    alternates: {
      canonical: `/courses/${slug}`,
    },
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
    .where(and(eq(courses.slug, slug), eq(courses.status, 'published')))
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
    <svg className="course-detail-check" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  const signedPreviewVideoUrl = course.previewVideoUrl && isBunnyVideo(course.previewVideoUrl)
    ? (() => {
        const bunnyVideo = extractBunnyVideoInfo(course.previewVideoUrl);
        return bunnyVideo
          ? generateSignedVideoUrl(bunnyVideo.videoId, 3600, bunnyVideo.libraryId)
          : course.previewVideoUrl;
      })()
    : course.previewVideoUrl;

  const price = parseFloat(course.price || '0');

  // Calculate total course duration
  const totalSeconds = course.lessons.reduce((sum: number, l: { videoDuration: number | null }) => sum + (l.videoDuration || 0), 0);
  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
  const durationText = totalHours > 0
    ? `${totalHours} ชั่วโมง ${totalMinutes > 0 ? `${totalMinutes} นาที` : ''}`
    : `${totalMinutes} นาที`;
  const now = new Date();
  const hasPromo = course.promoPrice !== null && course.promoPrice !== undefined;
  const promoStartOk = !course.promoStartsAt || new Date(course.promoStartsAt) <= now;
  const promoEndOk = !course.promoEndsAt || new Date(course.promoEndsAt) >= now;
  const isPromoActive = hasPromo && promoStartOk && promoEndOk;
  const promoPrice = isPromoActive ? parseFloat(course.promoPrice || '0') : null;
  const displayPrice = promoPrice !== null ? promoPrice : price;

  const courseJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.description ? getExcerpt(course.description, 160) : 'เรียนออนไลน์กับ MilerDev',
    url: `${siteUrl}/courses/${slug}`,
    ...(normalizeUrl(course.thumbnailUrl) && { image: normalizeUrl(course.thumbnailUrl) }),
    provider: {
      '@type': 'Organization',
      name: 'MilerDev',
      sameAs: siteUrl,
    },
    offers: {
      '@type': 'Offer',
      price: displayPrice,
      priceCurrency: 'THB',
      availability: 'https://schema.org/InStock',
      url: `${siteUrl}/courses/${slug}`,
    },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
    },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'หน้าแรก',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'คอร์สทั้งหมด',
        item: `${siteUrl}/courses`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: course.title,
        item: `${siteUrl}/courses/${slug}`,
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Navbar />

      <CourseDetailProvider>
      <main className="course-detail-page">
        {/* Course Header */}
        <section className="course-detail-hero">
          <div className="container course-detail-hero__grid">
            <div className="course-detail-hero__content">
              {/* Breadcrumb */}
              <nav className="course-detail-breadcrumb" aria-label="เส้นทางนำทาง">
                <Link href="/">หน้าแรก</Link>
                {' / '}
                <Link href="/courses">คอร์สทั้งหมด</Link>
                {' / '}
                <span>{course.title}</span>
              </nav>

              {course.tags && course.tags.length > 0 && (
                <div className="course-detail-tags">
                  {course.tags.map((tag: { id: string; name: string; slug: string }) => (
                    <Link
                      key={tag.id}
                      href={`/courses?tag=${tag.slug}`}
                      className="course-detail-tag"
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

              <h1>
                {course.title}
              </h1>

              {course.description && (
                <p className="course-detail-hero__lede">
                  {getExcerpt(course.description, 200)}
                </p>
              )}

              {/* Meta */}
              <div className="course-detail-facts">
                <div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>บทเรียน</div>
                  <div style={{ fontWeight: 500 }}>{course.lessons.length} บท</div>
                </div>

                {totalSeconds > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>ระยะเวลาเรียน</div>
                    <div style={{ fontWeight: 500 }}>{durationText}</div>
                  </div>
                )}
              </div>
            </div>
              {/* Right - Enrollment Card */}
              <div className="course-detail-sidebar">
                <div className="course-enroll-panel">
                  {/* Thumbnail */}
                  <div className="course-enroll-panel__media">
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

                    {/* Preview Video Play Button */}
                    {signedPreviewVideoUrl && (
                      <CoursePreviewVideo previewVideoUrl={signedPreviewVideoUrl} />
                    )}
                  </div>

                  {/* Promo Banner */}
                  {isPromoActive && promoPrice !== null && (
                    <div className="course-enroll-panel__promo">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9.375 3a1.875 1.875 0 000 3.75h1.875v4.5H3.375A1.875 1.875 0 011.5 9.375v-.75c0-1.036.84-1.875 1.875-1.875h3.193A3.375 3.375 0 0112 2.753a3.375 3.375 0 015.432 3.997h3.193c1.035 0 1.875.84 1.875 1.875v.75c0 1.036-.84 1.875-1.875 1.875H12.75v-4.5h1.875a1.875 1.875 0 10-1.875-1.875V6.75h-1.5V4.875C11.25 3.839 10.41 3 9.375 3zM11.25 12.75H3v6.75a2.25 2.25 0 002.25 2.25h6v-9zM12.75 12.75v9h6a2.25 2.25 0 002.25-2.25v-6.75h-8.25z" />
                      </svg>
                      โปรโมชั่นพิเศษ ลด {Math.round((1 - displayPrice / price) * 100)}%
                      {course.promoEndsAt && (
                        <span style={{ opacity: 0.85, fontWeight: 400 }}>
                          ถึง {new Date(course.promoEndsAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="course-enroll-panel__content">
                    {/* Price Display */}
                    <div className="course-enroll-panel__price">
                      {displayPrice === 0 ? (
                        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#16a34a' }}>ฟรี</div>
                      ) : isPromoActive ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-strong)' }}>฿{displayPrice.toLocaleString()}</span>
                            <span style={{ fontSize: '1.125rem', color: '#94a3b8', textDecoration: 'line-through' }}>฿{price.toLocaleString()}</span>
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
                    <div className="course-enroll-panel__benefits">
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
        </section>

        {/* Course Content */}
        <section className="course-detail-body">
          <div className="container">
            <div className="course-detail-grid">
              {/* Left - Description + Lessons */}
              <div className="course-detail-main">
                {course.description && (
                  <div className="course-detail-section">
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
                      dangerouslySetInnerHTML={{ __html: getSanitizedRichContentCached(course.description) }}
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

            </div>
          </div>
        </section>
      </main>
      </CourseDetailProvider>

      <Footer />


    </>
  );
}

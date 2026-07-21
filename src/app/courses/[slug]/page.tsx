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
import styles from './course-detail.module.css';

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
  const freePreviewCount = course.lessons.filter((lesson: { isFreePreview: boolean | null }) => lesson.isFreePreview).length;
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
  const instructorName = course.instructor?.name?.trim() || null;
  const instructorAvatarUrl = normalizeUrl(course.instructor?.avatarUrl || null);
  const reviewsIndex = instructorName ? '04' : '03';

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
      <a className={styles.skipLink} href="#course-curriculum">ข้ามไปดูเนื้อหาคอร์ส</a>
      <Navbar />

      <CourseDetailProvider>
      <main className={styles.page}>
        <header className={styles.hero}>
          <div className={styles.heroGrid}>
            <div className={styles.heroContent}>
              <nav className={styles.breadcrumb} aria-label="เส้นทางนำทาง">
                <Link href="/">หน้าแรก</Link>
                <span aria-hidden="true">/</span>
                <Link href="/courses">คอร์สทั้งหมด</Link>
                <span aria-hidden="true">/</span>
                <span aria-current="page">{course.title}</span>
              </nav>

              {course.tags && course.tags.length > 0 && (
                <div className={styles.tags} aria-label="หัวข้อคอร์ส">
                  {course.tags.map((tag: { id: string; name: string; slug: string }) => (
                    <Link
                      key={tag.id}
                      href={`/courses?tag=${tag.slug}`}
                      className={styles.tag}
                    >
                      {tag.name}
                    </Link>
                  ))}
                </div>
              )}

              <p className={styles.eyebrow}>Course brief / เรียนอะไร แล้วเริ่มอย่างไร</p>
              <h1>{course.title}</h1>

              {course.description && (
                <p className={styles.lede}>
                  {getExcerpt(course.description, 200)}
                </p>
              )}

              <section className={styles.evidence} aria-label="ข้อมูลประกอบการตัดสินใจ">
                <div className={styles.fact}>
                  <span>หลักสูตร</span>
                  <strong>{course.lessons.length} บท</strong>
                </div>
                <div className={styles.fact}>
                  <span>บททดลอง</span>
                  <strong>{freePreviewCount > 0 ? `${freePreviewCount} บทฟรี` : 'ยังไม่มีบททดลอง'}</strong>
                </div>
                {totalSeconds > 0 && (
                  <div className={styles.fact}>
                    <span>เวลาวิดีโอ</span>
                    <strong>{durationText}</strong>
                  </div>
                )}
                {instructorName && (
                  <div className={styles.fact}>
                    <span>ผู้สอน</span>
                    <strong>{instructorName}</strong>
                  </div>
                )}
              </section>

              <div className={styles.decisionPrompt}>
                <div>
                  <span>สำรวจก่อนสมัคร</span>
                  <p>
                    {freePreviewCount > 0
                      ? `เปิดดูบททดลองได้ ${freePreviewCount} บท แล้วค่อยตัดสินใจ`
                      : `ตรวจหัวข้อทั้ง ${course.lessons.length} บทก่อนตัดสินใจ`}
                  </p>
                </div>
                <a href="#course-curriculum">
                  ดูแผนการเรียน
                  <span aria-hidden="true">↓</span>
                </a>
              </div>

              <nav className={styles.sectionNav} aria-label="ส่วนต่าง ๆ ของคอร์ส">
                <a href="#course-curriculum">เนื้อหาคอร์ส</a>
                <a href="#course-overview">ภาพรวม</a>
                {instructorName && <a href="#course-instructor">ผู้สอน</a>}
                <a href="#course-reviews">รีวิวผู้เรียน</a>
              </nav>
            </div>
              <aside className={styles.enrollment} aria-label="การสมัครเรียน">
                <div className={styles.enrollPanel}>
                  {/* Promo Banner */}
                  {isPromoActive && promoPrice !== null && (
                    <div className={styles.promo}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9.375 3a1.875 1.875 0 000 3.75h1.875v4.5H3.375A1.875 1.875 0 011.5 9.375v-.75c0-1.036.84-1.875 1.875-1.875h3.193A3.375 3.375 0 0112 2.753a3.375 3.375 0 015.432 3.997h3.193c1.035 0 1.875.84 1.875 1.875v.75c0 1.036-.84 1.875-1.875 1.875H12.75v-4.5h1.875a1.875 1.875 0 10-1.875-1.875V6.75h-1.5V4.875C11.25 3.839 10.41 3 9.375 3zM11.25 12.75H3v6.75a2.25 2.25 0 002.25 2.25h6v-9zM12.75 12.75v9h6a2.25 2.25 0 002.25-2.25v-6.75h-8.25z" />
                      </svg>
                      โปรโมชั่นพิเศษ ลด {Math.round((1 - displayPrice / price) * 100)}%
                      {course.promoEndsAt && (
                        <span>
                          ถึง {new Date(course.promoEndsAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  )}

                  <div className={styles.enrollContent}>
                    <div className={styles.priceHeader}>
                      <p className={styles.priceLabel}>ค่าสมัครคอร์ส</p>
                      <span>ชำระครั้งเดียว</span>
                    </div>
                    {/* Price Display */}
                    <div className={styles.price}>
                      {displayPrice === 0 ? (
                        <strong className={styles.freePrice}>ฟรี</strong>
                      ) : isPromoActive ? (
                        <div>
                          <div className={styles.promoPrice}>
                            <strong>฿{displayPrice.toLocaleString()}</strong>
                            <del>฿{price.toLocaleString()}</del>
                          </div>
                        </div>
                      ) : (
                        <strong>฿{price.toLocaleString()}</strong>
                      )}
                    </div>

                    {/* CTA Button — rendered by CourseDetailClient */}
                    <div id="enroll-button-slot" className={styles.enrollAction}>
                      <CourseDetailClient
                        courseId={course.id}
                        courseSlug={course.slug}
                        price={displayPrice}
                        renderMode="button"
                      />
                    </div>

                    <p className={styles.enrollFootnote}>
                      {displayPrice === 0
                        ? 'เริ่มเรียนได้ทันทีหลังลงทะเบียน'
                        : 'เลือกชำระด้วยบัตรหรือ PromptPay ในขั้นตอนถัดไป'}
                    </p>

                    {/* Features */}
                    <div className={styles.benefits}>
                      <ul>
                        <li>
                          <CheckIcon />
                          เข้าถึงได้ตลอดชีพ
                        </li>
                        <li>
                          <CheckIcon />
                          เรียนได้ทุกอุปกรณ์
                        </li>
                        <li>
                          <CheckIcon />
                          Certificate เมื่อเรียนจบ
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Course media and optional preview follow the primary decision action. */}
                  <div className={styles.media}>
                    {normalizeUrl(course.thumbnailUrl) ? (
                      <img
                        src={normalizeUrl(course.thumbnailUrl)!}
                        alt={course.title}
                        className={styles.thumbnail}
                      />
                    ) : (
                      <div className={styles.mediaFallback}>
                        <svg style={{ width: '48px', height: '48px', color: 'rgba(255,255,255,0.6)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}

                    {signedPreviewVideoUrl && (
                      <CoursePreviewVideo previewVideoUrl={signedPreviewVideoUrl} />
                    )}
                  </div>
                </div>
              </aside>

          </div>
        </header>

        <section className={styles.body}>
          <div className={styles.bodyGrid}>
            <article className={styles.readingColumn}>
              <section id="course-curriculum" className={styles.contentSection} aria-labelledby="course-curriculum-title">
                <div className={styles.sectionHeadingRow}>
                  <div className={styles.sectionHeading}>
                    <p>01 / Curriculum</p>
                    <h2 id="course-curriculum-title">เส้นทางการเรียน</h2>
                  </div>
                  <p className={styles.sectionNote}>
                    {freePreviewCount > 0
                      ? `เปิดทดลองได้ ${freePreviewCount} บทก่อนตัดสินใจ`
                      : `${course.lessons.length} บทเรียนในคอร์สนี้`}
                  </p>
                </div>

                <CourseDetailClient
                  courseId={course.id}
                  courseSlug={course.slug}
                  lessons={course.lessons}
                />
              </section>

              <section id="course-overview" className={styles.contentSection} aria-labelledby="course-overview-title">
                <div className={styles.sectionHeading}>
                  <p>02 / Overview</p>
                  <h2 id="course-overview-title">รายละเอียดคอร์ส</h2>
                </div>
                {course.description ? (
                  <div
                    className={styles.description}
                    dangerouslySetInnerHTML={{ __html: getSanitizedRichContentCached(course.description) }}
                  />
                ) : (
                  <p className={styles.emptyCopy}>คอร์สนี้ยังไม่มีรายละเอียดเพิ่มเติม</p>
                )}
              </section>

              {instructorName && (
                <section id="course-instructor" className={styles.contentSection} aria-labelledby="course-instructor-title">
                  <div className={styles.sectionHeading}>
                    <p>03 / Instructor</p>
                    <h2 id="course-instructor-title">รู้จักผู้สอน</h2>
                  </div>
                  <div className={styles.instructorCard}>
                    {instructorAvatarUrl ? (
                      <img src={instructorAvatarUrl} alt="" className={styles.instructorAvatar} />
                    ) : (
                      <span className={styles.instructorInitial} aria-hidden="true">
                        {instructorName.charAt(0)}
                      </span>
                    )}
                    <div>
                      <span>ผู้สอนคอร์สนี้</span>
                      <strong>{instructorName}</strong>
                    </div>
                  </div>
                </section>
              )}

              <div id="course-reviews" className={styles.reviewsAnchor}>
                <p className={styles.reviewIndex}>{reviewsIndex} / Learner reviews</p>
                <CourseReviewsWrapper courseSlug={course.slug} />
              </div>
            </article>

            <aside className={styles.readingRail} aria-label="สรุปก่อนสมัคร">
              <p className={styles.railLabel}>Course map</p>
              <h2>ข้อมูลคอร์สในหน้าเดียว</h2>
              <dl>
                <div><dt>บทเรียนทั้งหมด</dt><dd>{course.lessons.length} บท</dd></div>
                <div><dt>บททดลอง</dt><dd>{freePreviewCount > 0 ? `${freePreviewCount} บท` : 'ไม่มี'}</dd></div>
                {totalSeconds > 0 && <div><dt>เวลาวิดีโอ</dt><dd>{durationText}</dd></div>}
                {instructorName && <div><dt>ผู้สอน</dt><dd>{instructorName}</dd></div>}
              </dl>
              <a href="#enroll-button-slot">กลับไปสมัครคอร์ส ↑</a>
            </aside>
          </div>
        </section>
      </main>
      </CourseDetailProvider>

      <Footer />


    </>
  );
}

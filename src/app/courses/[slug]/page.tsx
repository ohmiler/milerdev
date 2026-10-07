import PaymentCancellationNotice from '@/components/checkout/PaymentCancellationNotice';
import CourseAccessDeniedNotice from '@/components/course/CourseAccessDeniedNotice';
import MainContent from '@/components/layout/MainContent';
import { Fragment, Suspense, ViewTransition } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
// Image import removed - using native img for external URLs
import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import NavigationBreadcrumbs from '@/components/layout/NavigationBreadcrumbs';
import Footer from '@/components/layout/Footer';
import CourseDetailClient, { CourseDetailProvider } from '@/components/course/CourseDetailClient';
import CourseArtwork from '@/components/course/CourseArtwork';
import CourseCoverImage from '@/components/course/CourseCoverImage';
import { resolveCoverImage } from '@/lib/courses/cover-image';
import { courseCoverTransitionName } from '@/lib/courses/view-transition';
import CourseSectionNav from '@/components/course/CourseSectionNav';
import CourseReviewsWrapper from '@/components/course/CourseReviewsWrapper';
import CoursePreviewVideo from '@/components/course/CoursePreviewVideo';
import { db } from '@/lib/db';
import { courses, users, courseTags, tags } from '@/lib/db/schema';
import { readCoursePageLessons } from '@/lib/courses/page-lessons';
import { eq, and } from 'drizzle-orm';
import { extractBunnyVideoInfo, generateSignedVideoUrl, isBunnyVideo } from '@/lib/bunny/stream';
import { getExcerpt, getSanitizedRichContentCached } from '@/lib/security/sanitize';
import { absoluteUrl, DEFAULT_OG_IMAGE, serializeJsonLd, SITE_URL } from '@/lib/content/seo';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import CourseDetailSection from '@/components/course/CourseDetailSection';
import CourseFit, { hasCourseFitContent } from '@/components/course/CourseFit';
import CourseInstructorCard from '@/components/course/CourseInstructorCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Star } from 'lucide-react';
import { deriveCourseDecisionFacts } from '@/lib/commerce/course-decision-facts';
import { getCourseReviewStats } from '@/lib/courses/review-stats';

function normalizeUrl(url: string | null): string | null {
    if (!url || url.trim() === '') return null;
    if (url.startsWith('http')) return url;
    return `https://${url}`;
}

export const revalidate = 3600;

interface Props {
  searchParams?: Promise<{ payment?: string | string[]; access?: string | string[] }>;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [course] = await db
    .select({ title: courses.title, summary: courses.summary, description: courses.description, thumbnailUrl: courses.thumbnailUrl })
    .from(courses)
    .where(and(eq(courses.slug, slug), eq(courses.status, 'published')))
    .limit(1);

  if (!course) {
    return { title: 'ไม่พบคอร์ส' };
  }

  const description = course.summary ?? (course.description ? getExcerpt(course.description, 160) : 'เรียนออนไลน์กับ MilerDev');

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
      images: thumbnailUrl ? [{
          url: thumbnailUrl,
          width: 1200,
          height: 630,
          alt: course.title,
        }] : [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: course.title,
      description,
      images: [thumbnailUrl ?? DEFAULT_OG_IMAGE.url],
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

  // Parallelize instructor, lessons, tags, decision evidence and prerequisite queries
  const [instructorResult, courseLessons, courseTagRows, reviewStats, prerequisiteResult] = await Promise.all([
    course.instructorId
      ? db
          .select({
            id: users.id,
            name: users.name,
            avatarUrl: users.avatarUrl,
            headline: users.headline,
            bio: users.bio,
            profileLinks: users.profileLinks,
          })
          .from(users)
          .where(eq(users.id, course.instructorId))
          .limit(1)
      : Promise.resolve([]),
    readCoursePageLessons(course.id),
    db
      .select({ id: tags.id, name: tags.name, slug: tags.slug })
      .from(courseTags)
      .innerJoin(tags, eq(courseTags.tagId, tags.id))
      .where(eq(courseTags.courseId, course.id)),
    getCourseReviewStats(course.id),
    // Link only to a course a visitor can open.
    course.prerequisiteCourseId
      ? db
          .select({ title: courses.title, slug: courses.slug })
          .from(courses)
          .where(and(eq(courses.id, course.prerequisiteCourseId), eq(courses.status, 'published')))
          .limit(1)
      : Promise.resolve([]),
  ]);

  return {
    ...course,
    instructor: instructorResult[0] || null,
    lessons: courseLessons,
    tags: courseTagRows,
    reviewStats,
    prerequisiteCourse: prerequisiteResult[0] || null,
  };
}

export default async function CourseDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const cancelled = resolvedSearchParams?.payment === 'cancelled';
  const accessDenied = resolvedSearchParams?.access === 'denied';
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

  // Calculate total course duration
  const totalSeconds = course.lessons.reduce((sum: number, l: { videoDuration: number | null }) => sum + (l.videoDuration || 0), 0);
  const freePreviewCount = course.lessons.filter((lesson: { isFreePreview: boolean | null }) => lesson.isFreePreview).length;
  const firstPreviewLesson = course.lessons.find((lesson: { isFreePreview: boolean | null }) => lesson.isFreePreview) || null;
  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
  const durationText = totalHours > 0
    ? `${totalHours} ชั่วโมง ${totalMinutes > 0 ? `${totalMinutes} นาที` : ''}`
    : `${totalMinutes} นาที`;
  const decisionFacts = deriveCourseDecisionFacts({
    slug: course.slug,
    regularPrice: course.price,
    promotion: course.promoPrice === null
      ? null
      : {
          price: course.promoPrice,
          startsAt: course.promoStartsAt,
          endsAt: course.promoEndsAt,
        },
    lessonCount: course.lessons.length,
    knownDurationSeconds: totalSeconds,
    freePreviewCount,
    instructor: course.instructor ? { name: course.instructor.name } : null,
    verifiedReview: course.reviewStats.totalReviews > 0
      ? {
          average: course.reviewStats.avgRating,
          count: course.reviewStats.totalReviews,
        }
      : null,
  }, { now: new Date() });
  const displayPrice = decisionFacts.price.effective;
  const courseReady = decisionFacts.readiness === 'ready';
  const instructorName = decisionFacts.evidence.instructorName;
  const verifiedReview = decisionFacts.evidence.verifiedReview;
  const instructorAvatarUrl = normalizeUrl(course.instructor?.avatarUrl || null);
  const cover = resolveCoverImage(course.thumbnailUrl);
  // An admin-written summary leads; the description excerpt stays the fallback (ADR 0005).
  const lead = course.summary ?? (course.description ? getExcerpt(course.description, 200) : null);
  const fit = {
    learningOutcomes: course.learningOutcomes,
    targetAudience: course.targetAudience,
    prerequisites: course.prerequisites,
    prerequisiteCourse: course.prerequisiteCourse,
  };
  const showFit = hasCourseFitContent(fit);
  const curriculumMeta = [
    courseReady ? `${course.lessons.length} บท` : null,
    totalSeconds > 0 ? durationText : null,
    freePreviewCount > 0 ? `ทดลองฟรี ${freePreviewCount} บท` : null,
  ].filter(Boolean).join(' · ');

  const courseSectionItems = [
    { id: 'course-overview', label: showFit ? 'เหมาะกับคุณไหม' : 'รายละเอียดคอร์ส' },
    { id: 'course-curriculum', label: 'บทเรียน', count: course.lessons.length },
    ...(instructorName ? [{ id: 'course-instructor', label: 'ผู้สอน' }] : []),
    { id: 'course-reviews', label: 'รีวิว', count: verifiedReview?.count },
  ];

  const courseJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.summary ?? (course.description ? getExcerpt(course.description, 160) : 'เรียนออนไลน์กับ MilerDev'),
    url: absoluteUrl(`/courses/${slug}`),
    inLanguage: 'th-TH',
    isAccessibleForFree: displayPrice === 0,
    ...(normalizeUrl(course.thumbnailUrl) && { image: normalizeUrl(course.thumbnailUrl) }),
    provider: {
      '@id': `${SITE_URL}/#organization`,
    },
    offers: {
      '@type': 'Offer',
      price: displayPrice,
      priceCurrency: 'THB',
      availability: courseReady ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: absoluteUrl(`/courses/${slug}`),
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
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'คอร์สทั้งหมด',
        item: absoluteUrl('/courses'),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: course.title,
        item: absoluteUrl(`/courses/${slug}`),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(courseJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }} />
      <a className="sr-only z-50 rounded-md bg-background px-4 py-2 focus:not-sr-only focus:fixed focus:left-4 focus:top-4" href="#course-overview">ข้ามไปดูรายละเอียดคอร์ส</a>
      <Navbar />

      <CourseDetailProvider>
          <MainContent className="min-h-screen bg-background text-foreground">
          {cancelled ? <PaymentCancellationNotice /> : null}
          {accessDenied ? <CourseAccessDeniedNotice /> : null}

          <header className="bg-[radial-gradient(circle_at_12%_8%,var(--color-accent-soft),transparent_36%),linear-gradient(180deg,var(--academy-canvas),var(--background))]">
            <div className="mx-auto grid max-w-[1204px] gap-8 px-5 py-10 sm:px-8 md:grid-cols-[minmax(0,1fr)_20rem] md:gap-9 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-20 lg:py-14">
              <div className="min-w-0 self-center">
                <NavigationBreadcrumbs
                  className="mb-6"
                  items={[
                    { href: '/', label: 'หน้าแรก' },
                    { href: '/courses', label: 'คอร์สทั้งหมด' },
                    { label: course.title },
                  ]}
                />

                {course.tags.length > 0 && (
                  <p className="mb-3 flex flex-wrap items-center gap-x-2 text-sm font-semibold text-link">
                    {course.tags.map((tag: { id: string; name: string; slug: string }, index: number) => (
                      <Fragment key={tag.id}>
                        {index > 0 ? <span aria-hidden="true">·</span> : null}
                        <Link href={`/courses?tag=${tag.slug}`} className="inline-flex min-h-6 items-center underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30">{tag.name}</Link>
                      </Fragment>
                    ))}
                  </p>
                )}

                <h1 className="max-w-3xl text-h1 font-bold text-balance">{course.title}</h1>
                {lead && (
                  <p className="mt-4 max-w-2xl text-lead text-muted-foreground text-pretty">{lead}</p>
                )}

                {instructorName && (
                  <a href="#course-instructor" className="mt-6 inline-flex items-center gap-3 rounded-full pr-3 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30">
                    {instructorAvatarUrl ? (
                      <img src={instructorAvatarUrl} alt="" width={44} height={44} className="size-11 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary font-bold text-secondary-foreground" aria-hidden="true">{instructorName.charAt(0)}</span>
                    )}
                    <span className="grid leading-snug">
                      <span className="text-caption text-muted-foreground">สอนโดย</span>
                      <span className="font-semibold wrap-anywhere">{instructorName}</span>
                    </span>
                  </a>
                )}

                {(courseReady || totalSeconds > 0 || freePreviewCount > 0 || verifiedReview) && (
                  <ul aria-label="ข้อมูลประกอบการตัดสินใจ" className="mt-6 flex flex-wrap gap-x-7 gap-y-3 border-t pt-5 text-muted-foreground">
                    {courseReady && <li><strong className="font-semibold text-foreground tabular-nums">{course.lessons.length}</strong> บทเรียน</li>}
                    {totalSeconds > 0 && <li>วิดีโอรวม <strong className="font-semibold text-foreground tabular-nums">{durationText}</strong></li>}
                    {freePreviewCount > 0 && <li>ทดลองเรียนฟรี <strong className="font-semibold text-foreground tabular-nums">{freePreviewCount} บท</strong></li>}
                    {verifiedReview && (
                      <li>
                        <a href="#course-reviews" className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30">
                          <Star className="size-4 fill-primary text-primary" aria-hidden="true" />
                          <strong className="font-semibold text-foreground tabular-nums">{verifiedReview.average.toFixed(1)}</strong> จาก {verifiedReview.count} รีวิว
                        </a>
                      </li>
                    )}
                  </ul>
                )}
              </div>

              <aside className="w-full max-w-lg justify-self-center md:self-center" aria-label="ตัวอย่างและการสมัครเรียน">
                <Card className="gap-0 overflow-hidden py-0 shadow-[var(--academy-shadow-card)]">
                  <div className="relative bg-muted">
                    <ViewTransition name={courseCoverTransitionName(course.slug)} share="morph" default="none">
                      {cover ? (
                        <CourseCoverImage
                          cover={cover}
                          alt={course.title}
                          width={1200}
                          height={675}
                          // The purchase card is 22rem wide from lg, 20rem from md, and at most 32rem on phones.
                          sizes="(min-width: 1024px) 22rem, (min-width: 768px) 20rem, min(100vw, 32rem)"
                          // The cover is the largest image in the first view, so it should not wait to be lazy-loaded.
                          loading="eager"
                          fetchPriority="high"
                          className="aspect-video w-full object-cover"
                        />
                      ) : (
                        <div className="aspect-video overflow-hidden"><CourseArtwork title={course.title} slug={course.slug} tags={course.tags} /></div>
                      )}
                    </ViewTransition>
                    {signedPreviewVideoUrl && <CoursePreviewVideo previewVideoUrl={signedPreviewVideoUrl} />}
                  </div>
                  <CardContent id="course-action" className="scroll-mt-40 p-6">
                    <CourseDetailClient
                      courseId={course.id}
                      courseSlug={course.slug}
                      decisionFacts={decisionFacts}
                      previewLessonHref={firstPreviewLesson ? `/courses/${course.slug}/learn/${firstPreviewLesson.id}` : null}
                      hasVideoPreview={Boolean(signedPreviewVideoUrl)}
                      renderMode="button"
                    />
                  </CardContent>
                </Card>
              </aside>
            </div>
          </header>

          <CourseSectionNav items={courseSectionItems} />

          <article className="mx-auto max-w-[1204px] px-5 sm:px-8">
            {showFit ? (
              <CourseDetailSection id="course-overview" title="คอร์สนี้เหมาะกับคุณไหม">
                <CourseFit content={fit} />
                {course.description ? (
                  <details className="mt-5 rounded-xl border bg-card px-6 py-4">
                    <summary className="flex min-h-11 cursor-pointer items-center font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30">อ่านคำอธิบายคอร์สฉบับเต็ม</summary>
                    <div className="mt-3">
                      <div className="rich-content text-sm leading-8 [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_p]:leading-8 [&_li]:leading-8" dangerouslySetInnerHTML={{ __html: getSanitizedRichContentCached(course.description) }} />
                    </div>
                  </details>
                ) : null}
              </CourseDetailSection>
            ) : (
              <CourseDetailSection id="course-overview" title="รายละเอียดคอร์ส">
                {course.description ? (
                  <div className="rich-content text-sm leading-8 [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_p]:leading-8 [&_li]:leading-8" dangerouslySetInnerHTML={{ __html: getSanitizedRichContentCached(course.description) }} />
                ) : (
                  <Empty className="border p-6">
                    <EmptyHeader>
                      <EmptyTitle>กำลังเตรียมรายละเอียดคอร์ส</EmptyTitle>
                      <EmptyDescription>คอร์สนี้ยังไม่มีรายละเอียดเพิ่มเติม</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </CourseDetailSection>
            )}
            <CourseDetailSection id="course-curriculum" title="บทเรียนทั้งหมด" meta={curriculumMeta || undefined}>
              <CourseDetailClient courseId={course.id} courseSlug={course.slug} decisionFacts={decisionFacts} lessons={course.lessons} />
            </CourseDetailSection>
            {course.instructor && instructorName && (
              <CourseDetailSection id="course-instructor" title="ผู้สอน">
                <CourseInstructorCard instructor={{ ...course.instructor, name: instructorName, avatarUrl: instructorAvatarUrl }} />
              </CourseDetailSection>
            )}
            <CourseDetailSection id="course-reviews" title="รีวิวจากผู้เรียน" description="ประสบการณ์จากผู้ที่เรียนคอร์สนี้">
              <Suspense fallback={<div role="status" aria-label="กำลังโหลดรีวิว"><Skeleton className="h-32 w-full" /></div>}>
                <CourseReviewsWrapper courseSlug={course.slug} />
              </Suspense>
            </CourseDetailSection>
            {courseReady && <CourseDetailClient courseId={course.id} courseSlug={course.slug} decisionFacts={decisionFacts} renderMode="final-action" />}
            <CourseDetailClient courseId={course.id} courseSlug={course.slug} decisionFacts={decisionFacts} renderMode="mobile-bar" />
          </article>
          </MainContent>
      </CourseDetailProvider>

      <Footer />
    </>
  );
}

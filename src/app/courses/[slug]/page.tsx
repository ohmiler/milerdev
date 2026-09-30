import PaymentCancellationNotice from '@/components/checkout/PaymentCancellationNotice';
import MainContent from '@/components/layout/MainContent';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
// Image import removed - using native img for external URLs
import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import NavigationBreadcrumbs from '@/components/layout/NavigationBreadcrumbs';
import Footer from '@/components/layout/Footer';
import CourseDetailClient, { CourseDetailProvider } from '@/components/course/CourseDetailClient';
import CourseArtwork from '@/components/course/CourseArtwork';
import CourseSectionNav from '@/components/course/CourseSectionNav';
import CourseReviewsWrapper from '@/components/course/CourseReviewsWrapper';
import CoursePreviewVideo from '@/components/course/CoursePreviewVideo';
import { db } from '@/lib/db';
import { courses, lessons, users, courseTags, tags } from '@/lib/db/schema';
import { eq, asc, and } from 'drizzle-orm';
import { extractBunnyVideoInfo, generateSignedVideoUrl, isBunnyVideo } from '@/lib/bunny';
import { getExcerpt, getSanitizedRichContentCached } from '@/lib/sanitize';
import { absoluteUrl, serializeJsonLd, SITE_URL } from '@/lib/seo';
import AnalyticsViewEvent from '@/components/analytics/AnalyticsViewEvent';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';
import CourseDetailSection from '@/components/course/CourseDetailSection';
import { Skeleton } from '@/components/ui/skeleton';
import { Star } from 'lucide-react';
import { deriveCourseDecisionFacts } from '@/lib/course-decision-facts';
import { getCourseReviewStats } from '@/lib/course-review-stats';

function normalizeUrl(url: string | null): string | null {
    if (!url || url.trim() === '') return null;
    if (url.startsWith('http')) return url;
    return `https://${url}`;
}

export const revalidate = 3600;

interface Props {
  searchParams?: Promise<{ payment?: string | string[] }>;
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

  // Parallelize instructor, lessons, tags, and decision evidence queries
  const [instructorResult, courseLessons, courseTagRows, reviewStats] = await Promise.all([
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
    getCourseReviewStats(course.id),
  ]);

  return {
    ...course,
    instructor: instructorResult[0] || null,
    lessons: courseLessons,
    tags: courseTagRows,
    reviewStats,
  };
}

export default async function CourseDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const cancelled = (await searchParams)?.payment === 'cancelled';
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

  const courseSectionItems = [
    { id: 'course-overview', label: 'รายละเอียดคอร์ส' },
    { id: 'course-curriculum', label: 'เนื้อหาคอร์ส', count: course.lessons.length },
    ...(instructorName ? [{ id: 'course-instructor', label: 'ผู้สอน' }] : []),
    { id: 'course-reviews', label: 'รีวิวผู้เรียน', count: verifiedReview?.count },
  ];

  const courseJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.description ? getExcerpt(course.description, 160) : 'เรียนออนไลน์กับ MilerDev',
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
        <AnalyticsViewEvent productType="course" productId={course.id}>
          <MainContent className="min-h-screen bg-background text-foreground">
          {cancelled ? <PaymentCancellationNotice /> : null}

          <header className="bg-[radial-gradient(circle_at_12%_8%,var(--color-accent-soft),transparent_36%),linear-gradient(180deg,var(--academy-canvas),var(--background))]">
            <div className="mx-auto grid max-w-[1204px] gap-8 px-5 py-10 sm:px-8 md:grid-cols-[minmax(0,1fr)_20rem] md:gap-9 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-20 lg:py-14">
              <div className="min-w-0 self-center">
                <NavigationBreadcrumbs
                  className="mb-8"
                  items={[
                    { href: '/', label: 'หน้าแรก' },
                    { href: '/courses', label: 'คอร์สทั้งหมด' },
                    { label: course.title },
                  ]}
                />

                {course.tags.length > 0 && (
                  <div className="mb-5 flex flex-wrap gap-2" aria-label="หัวข้อคอร์ส">
                    {course.tags.map((tag: { id: string; name: string; slug: string }) => (
                      <Link key={tag.id} href={`/courses?tag=${tag.slug}`} className="inline-flex rounded-md border bg-card px-2.5 py-1 text-xs font-medium transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30">
                        {tag.name}
                      </Link>
                    ))}
                  </div>
                )}

                <h1 className="max-w-3xl text-4xl leading-[1.15] font-bold tracking-[-.04em] text-balance lg:text-5xl xl:text-[3.5rem]">{course.title}</h1>
                {course.description && (
                  <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground text-pretty">{getExcerpt(course.description, 200)}</p>
                )}

                {verifiedReview && (
                  <a href="#course-reviews" className="mt-6 inline-flex flex-wrap items-center gap-2 text-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30">
                    <Star className="size-4 fill-primary text-primary" aria-hidden="true" />
                    <strong>{verifiedReview.average.toFixed(1)} / 5</strong>
                    <span className="text-muted-foreground">จาก {verifiedReview.count} รีวิว</span>
                  </a>
                )}
                {(courseReady || totalSeconds > 0 || freePreviewCount > 0) && (
                  <section className="mt-7" aria-label="ข้อมูลประกอบการตัดสินใจ">
                    <Separator className="mb-5" />
                    <dl className="flex flex-wrap gap-x-7 gap-y-4">
                      {courseReady && <div><dt className="text-xs text-muted-foreground">บทเรียน</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{course.lessons.length} <span className="text-sm font-normal">บท</span></dd></div>}
                      {totalSeconds > 0 && <div><dt className="text-xs text-muted-foreground">วิดีโอทั้งหมด</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{durationText}</dd></div>}
                      {freePreviewCount > 0 && <div><dt className="text-xs text-muted-foreground">ทดลองเรียนฟรี</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{freePreviewCount} <span className="text-sm font-normal">บท</span></dd></div>}
                    </dl>
                  </section>
                )}
              </div>

              <aside className="w-full max-w-lg justify-self-center md:self-center" aria-label="ตัวอย่างและการสมัครเรียน">
                <Card className="gap-0 overflow-hidden py-0 shadow-[var(--academy-shadow-card)]">
                  <div className="relative bg-muted">
                    {normalizeUrl(course.thumbnailUrl) ? (
                      <img src={normalizeUrl(course.thumbnailUrl)!} alt={course.title} width={1200} height={675} sizes="(min-width: 1024px) 40vw, 100vw" className="aspect-video w-full object-cover" />
                    ) : (
                      <div className="aspect-video overflow-hidden"><CourseArtwork title={course.title} slug={course.slug} tags={course.tags} /></div>
                    )}
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
            <CourseDetailSection id="course-overview" eyebrow="ภาพรวมคอร์ส" title="รายละเอียดคอร์ส">
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
            <Separator />
            <CourseDetailSection id="course-curriculum" eyebrow="เนื้อหาคอร์ส" title="มองเห็นเส้นทางก่อนเริ่มเรียน" description="เรียนตามลำดับ หรือกลับมาทบทวนบทที่ต้องการ">
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="text-base font-semibold">รายการบทเรียนทั้งหมด</h3>
                {courseReady && <p className="text-xs text-muted-foreground">{course.lessons.length} บท{totalSeconds > 0 ? ' · ' + durationText : ''}</p>}
              </div>
              <CourseDetailClient courseId={course.id} courseSlug={course.slug} decisionFacts={decisionFacts} lessons={course.lessons} />
            </CourseDetailSection>
            {instructorName && (
              <>
                <Separator />
                <CourseDetailSection id="course-instructor" eyebrow="ผู้สอน" title="รู้จักผู้สอน">
                  <Card className="py-0">
                    <CardContent className="flex items-center gap-5 p-6">
                      {instructorAvatarUrl ? (
                        <img src={instructorAvatarUrl} alt="" width={64} height={64} className="size-16 shrink-0 rounded-2xl object-cover" />
                      ) : (
                        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-secondary text-xl font-bold text-secondary-foreground" aria-hidden="true">{instructorName.charAt(0)}</span>
                      )}
                      <div className="grid min-w-0 gap-1">
                        <span className="text-sm text-muted-foreground">ผู้สอนและดูแลเนื้อหาคอร์สนี้</span>
                        <strong className="text-lg wrap-anywhere">{instructorName}</strong>
                      </div>
                    </CardContent>
                  </Card>
                </CourseDetailSection>
              </>
            )}
            <Separator />
            <CourseDetailSection id="course-reviews" eyebrow="เสียงจากผู้เรียน" title="รีวิวจากผู้เรียน" description="ประสบการณ์จากผู้ที่เรียนคอร์สนี้">
              <Suspense fallback={<div role="status" aria-label="กำลังโหลดรีวิว"><Skeleton className="h-32 w-full" /></div>}>
                <CourseReviewsWrapper courseSlug={course.slug} />
              </Suspense>
            </CourseDetailSection>
            {courseReady && <CourseDetailClient courseId={course.id} courseSlug={course.slug} decisionFacts={decisionFacts} renderMode="final-action" />}
          </article>
          </MainContent>
        </AnalyticsViewEvent>
      </CourseDetailProvider>

      <Footer />
    </>
  );
}

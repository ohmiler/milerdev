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
import AnalyticsViewEvent from '@/components/analytics/AnalyticsViewEvent';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

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
  const courseReady = course.lessons.length > 0;
  const firstPreviewLesson = course.lessons.find((lesson: { isFreePreview: boolean | null }) => lesson.isFreePreview) || null;
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
  const promoDiscount = isPromoActive && price > 0
    ? Math.round((1 - displayPrice / price) * 100)
    : null;
  const promoLabel = promoDiscount !== null
    ? `โปรโมชั่น ลด ${promoDiscount}%${course.promoEndsAt ? ` ถึง ${new Date(course.promoEndsAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}`
    : null;

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
      availability: courseReady ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
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
      <a className="sr-only z-50 rounded-md bg-background px-4 py-2 focus:not-sr-only focus:fixed focus:left-4 focus:top-4" href="#course-overview">ข้ามไปดูรายละเอียดคอร์ส</a>
      <Navbar />

      <CourseDetailProvider>
        <main className="min-h-screen bg-background text-foreground">
          <AnalyticsViewEvent event={{ eventName: 'course_viewed', courseId: course.id, placement: 'course_detail' }} />

          <header className="border-b bg-muted/30">
            <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_25rem] lg:px-8 lg:py-16">
              <div className="min-w-0 self-center">
                <nav className="mb-7 flex flex-wrap items-center gap-2 text-sm text-muted-foreground [&_a:hover]:text-foreground" aria-label="เส้นทางนำทาง">
                  <Link href="/">หน้าแรก</Link>
                  <span aria-hidden="true">/</span>
                  <Link href="/courses">คอร์สทั้งหมด</Link>
                  <span aria-hidden="true">/</span>
                  <span aria-current="page">{course.title}</span>
                </nav>

                {course.tags.length > 0 && (
                  <div className="mb-5 flex flex-wrap gap-2" aria-label="หัวข้อคอร์ส">
                    {course.tags.map((tag: { id: string; name: string; slug: string }) => (
                      <Link key={tag.id} href={`/courses?tag=${tag.slug}`} className="inline-flex rounded-full border bg-background px-3 py-1 text-xs font-medium transition-colors hover:border-primary/40 hover:text-primary">
                        {tag.name}
                      </Link>
                    ))}
                  </div>
                )}

                <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">{course.title}</h1>
                {course.description && (
                  <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground text-pretty">{getExcerpt(course.description, 200)}</p>
                )}

                <section className="mt-8" aria-label="ข้อมูลประกอบการตัดสินใจ">
                  <dl className="flex flex-wrap gap-x-8 gap-y-4 text-sm">
                    {courseReady && <div><dt className="text-muted-foreground">บทเรียน</dt><dd className="mt-1 font-semibold">{course.lessons.length} บท</dd></div>}
                    {totalSeconds > 0 && <div><dt className="text-muted-foreground">เวลาวิดีโอ</dt><dd className="mt-1 font-semibold">{durationText}</dd></div>}
                    {freePreviewCount > 0 && <div><dt className="text-muted-foreground">ทดลองเรียน</dt><dd className="mt-1 font-semibold">{freePreviewCount} บทฟรี</dd></div>}
                    {instructorName && <div><dt className="text-muted-foreground">ผู้สอน</dt><dd className="mt-1 font-semibold">{instructorName}</dd></div>}
                  </dl>
                </section>
              </div>

              <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="ตัวอย่างและการสมัครเรียน">
                <Card className="overflow-hidden shadow-lg">
                  <div className="relative bg-muted">
                    {normalizeUrl(course.thumbnailUrl) ? (
                      <img src={normalizeUrl(course.thumbnailUrl)!} alt={course.title} className="aspect-video w-full object-cover" />
                    ) : (
                      <div className="flex aspect-video items-center justify-center bg-slate-950 text-white/60">
                        <svg className="size-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                    {signedPreviewVideoUrl && <CoursePreviewVideo previewVideoUrl={signedPreviewVideoUrl} />}
                  </div>
                  <CardContent id="course-action" className="scroll-mt-24 p-6">
                    <CourseDetailClient
                      courseId={course.id}
                      courseSlug={course.slug}
                      price={displayPrice}
                      originalPrice={price}
                      promoLabel={promoLabel}
                      courseReady={courseReady}
                      previewLessonHref={firstPreviewLesson ? `/courses/${course.slug}/learn/${firstPreviewLesson.id}` : null}
                      hasVideoPreview={Boolean(signedPreviewVideoUrl)}
                      renderMode="button"
                    />
                  </CardContent>
                </Card>
              </aside>
            </div>
          </header>

          <nav className="border-b bg-background" aria-label="ส่วนต่าง ๆ ของคอร์ส">
            <div className="mx-auto flex max-w-5xl gap-6 overflow-x-auto px-4 py-4 text-sm font-medium sm:px-6 lg:px-8 [&_a]:whitespace-nowrap [&_a:hover]:text-primary">
              <a href="#course-overview">รายละเอียดคอร์ส</a>
              <a href="#course-curriculum">เนื้อหาคอร์ส</a>
              {instructorName && <a href="#course-instructor">ผู้สอน</a>}
              <a href="#course-reviews">รีวิวผู้เรียน</a>
            </div>
          </nav>

          <article className="mx-auto max-w-5xl space-y-12 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <section id="course-overview" className="scroll-mt-24" aria-labelledby="course-overview-title">
              <h2 className="text-3xl font-bold tracking-tight" id="course-overview-title">รายละเอียดคอร์ส</h2>
              {course.description ? (
                <div className="rich-content mt-6 max-w-3xl" dangerouslySetInnerHTML={{ __html: getSanitizedRichContentCached(course.description) }} />
              ) : (
                <p className="mt-6 rounded-xl border border-dashed p-6 text-muted-foreground">คอร์สนี้ยังไม่มีรายละเอียดเพิ่มเติม</p>
              )}
            </section>

            <Separator />

            <section id="course-curriculum" className="scroll-mt-24" aria-labelledby="course-curriculum-title">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight" id="course-curriculum-title">เส้นทางการเรียน</h2>
                </div>
                {courseReady && (
                  <p className="text-sm text-muted-foreground">
                    {course.lessons.length} บท{totalSeconds > 0 ? ` · ${durationText}` : ''}{freePreviewCount > 0 ? ` · ทดลองฟรี ${freePreviewCount} บท` : ''}
                  </p>
                )}
              </div>
              <CourseDetailClient courseId={course.id} courseSlug={course.slug} lessons={course.lessons} />
            </section>

            {instructorName && (
              <>
                <Separator />
                <section id="course-instructor" className="scroll-mt-24" aria-labelledby="course-instructor-title">
                  <h2 className="text-3xl font-bold tracking-tight" id="course-instructor-title">รู้จักผู้สอน</h2>
                  <Card className="mt-6 shadow-none"><CardContent className="flex items-center gap-4 p-5">
                    {instructorAvatarUrl ? (
                      <img src={instructorAvatarUrl} alt="" className="size-14 rounded-full object-cover" />
                    ) : (
                      <span className="flex size-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground" aria-hidden="true">{instructorName.charAt(0)}</span>
                    )}
                    <div className="grid gap-1">
                      <span className="text-sm text-muted-foreground">ผู้สอนคอร์สนี้</span>
                      <strong className="text-lg">{instructorName}</strong>
                    </div>
                  </CardContent></Card>
                </section>
              </>
            )}

            <Separator />

            <section id="course-reviews" className="scroll-mt-24" aria-labelledby="course-reviews-title">
              <h2 id="course-reviews-title" className="sr-only">รีวิวผู้เรียน</h2>
              <div className="mt-5"><CourseReviewsWrapper courseSlug={course.slug} /></div>
            </section>

            {courseReady && (
              <Card className="border-primary/20 bg-primary/5 shadow-none">
                <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold">พร้อมเริ่มเรียนแล้วหรือยัง?</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">กลับไปสมัครคอร์ส หรือเข้าเรียนต่อได้จากตรงนี้</p>
                  </div>
                  <CourseDetailClient courseId={course.id} courseSlug={course.slug} price={displayPrice} courseReady={courseReady} renderMode="final-action" />
                </CardContent>
              </Card>
            )}
          </article>
        </main>
      </CourseDetailProvider>

      <Footer />
    </>
  );
}

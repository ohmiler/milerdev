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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

function CheckIcon() {
  return (
    <svg className="size-4 shrink-0 text-primary" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <a className="sr-only z-50 rounded-md bg-background px-4 py-2 focus:not-sr-only focus:fixed focus:left-4 focus:top-4" href="#course-curriculum">ข้ามไปดูเนื้อหาคอร์ส</a>
      <Navbar />

      <CourseDetailProvider>
      <main className="min-h-screen bg-background text-foreground">
        <AnalyticsViewEvent event={{ eventName: 'course_viewed', courseId: course.id, placement: 'course_detail' }} />
        <header className="border-b bg-muted/30">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_25rem] lg:px-8 lg:py-16">
            <div className="min-w-0">
              <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground [&_a:hover]:text-foreground" aria-label="เส้นทางนำทาง">
                <Link href="/">หน้าแรก</Link>
                <span aria-hidden="true">/</span>
                <Link href="/courses">คอร์สทั้งหมด</Link>
                <span aria-hidden="true">/</span>
                <span aria-current="page">{course.title}</span>
              </nav>

              {course.tags && course.tags.length > 0 && (
                <div className="mb-5 flex flex-wrap gap-2" aria-label="หัวข้อคอร์ส">
                  {course.tags.map((tag: { id: string; name: string; slug: string }) => (
                    <Link
                      key={tag.id}
                      href={`/courses?tag=${tag.slug}`}
                      className="inline-flex rounded-full border bg-background px-3 py-1 text-xs font-medium hover:border-primary/40"
                    >
                      {tag.name}
                    </Link>
                  ))}
                </div>
              )}

              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Course brief / เรียนอะไร แล้วเริ่มอย่างไร</p>
              <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">{course.title}</h1>

              {course.description && (
                <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
                  {getExcerpt(course.description, 200)}
                </p>
              )}

              <section className="mt-8 grid gap-3 sm:grid-cols-2" aria-label="ข้อมูลประกอบการตัดสินใจ">
                <div className="rounded-lg border bg-background p-4">
                  <span>หลักสูตร</span>
                  <strong>{course.lessons.length} บท</strong>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <span>บททดลอง</span>
                  <strong>{freePreviewCount > 0 ? `${freePreviewCount} บทฟรี` : 'ยังไม่มีบททดลอง'}</strong>
                </div>
                {totalSeconds > 0 && (
                  <div className="rounded-lg border bg-background p-4">
                    <span>เวลาวิดีโอ</span>
                    <strong>{durationText}</strong>
                  </div>
                )}
                {instructorName && (
                  <div className="rounded-lg border bg-background p-4">
                    <span>ผู้สอน</span>
                    <strong>{instructorName}</strong>
                  </div>
                )}
              </section>

              <Card className="mt-6 border-primary/20 bg-primary/5 shadow-none">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span>สำรวจก่อนสมัคร</span>
                  <p>
                    {freePreviewCount > 0
                      ? `เปิดดูบททดลองได้ ${freePreviewCount} บท แล้วค่อยตัดสินใจ`
                      : `ตรวจหัวข้อทั้ง ${course.lessons.length} บทก่อนตัดสินใจ`}
                  </p>
                </div>
                <Button asChild variant="outline"><a href="#course-curriculum">ดูแผนการเรียน <span aria-hidden="true">↓</span></a></Button>
                </CardContent>
              </Card>

              <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium [&_a:hover]:text-primary" aria-label="ส่วนต่าง ๆ ของคอร์ส">
                <a href="#course-curriculum">เนื้อหาคอร์ส</a>
                <a href="#course-overview">ภาพรวม</a>
                {instructorName && <a href="#course-instructor">ผู้สอน</a>}
                <a href="#course-reviews">รีวิวผู้เรียน</a>
              </nav>
            </div>
              <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="การสมัครเรียน">
                <Card className="overflow-hidden shadow-lg">
                  {/* Promo Banner */}
                  {isPromoActive && promoPrice !== null && (
                    <div className="flex flex-wrap items-center gap-2 bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
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

                  <CardContent className="space-y-5 p-6">
                    <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">ค่าสมัครคอร์ส</p>
                      <span>ชำระครั้งเดียว</span>
                    </div>
                    {/* Price Display */}
                    <div className="text-3xl font-bold tracking-tight">
                      {displayPrice === 0 ? (
                        <strong className="text-primary">ฟรี</strong>
                      ) : isPromoActive ? (
                        <div>
                          <div className="flex items-baseline gap-3 [&_del]:text-base [&_del]:font-normal [&_del]:text-muted-foreground">
                            <strong>฿{displayPrice.toLocaleString()}</strong>
                            <del>฿{price.toLocaleString()}</del>
                          </div>
                        </div>
                      ) : (
                        <strong>฿{price.toLocaleString()}</strong>
                      )}
                    </div>

                    {/* CTA Button — rendered by CourseDetailClient */}
                    <div id="enroll-button-slot" className="[&_button]:w-full">
                      <CourseDetailClient
                        courseId={course.id}
                        courseSlug={course.slug}
                        price={displayPrice}
                        renderMode="button"
                      />
                    </div>

                    <p className="text-sm leading-6 text-muted-foreground">
                      {displayPrice === 0
                        ? 'เริ่มเรียนได้ทันทีหลังลงทะเบียน'
                        : 'เลือกชำระด้วยบัตรหรือ PromptPay ในขั้นตอนถัดไป'}
                    </p>

                    {/* Features */}
                    <div>
                      <ul className="grid gap-3 text-sm">
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
                  </CardContent>

                  {/* Course media and optional preview follow the primary decision action. */}
                  <div className="border-t bg-muted">
                    {normalizeUrl(course.thumbnailUrl) ? (
                      <img
                        src={normalizeUrl(course.thumbnailUrl)!}
                        alt={course.title}
                        className="aspect-video w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-video items-center justify-center bg-slate-950">
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
                </Card>
              </aside>

          </div>
        </header>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <article className="min-w-0 space-y-12">
              <section id="course-curriculum" className="scroll-mt-24" aria-labelledby="course-curriculum-title">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">01 / Curriculum</p>
                    <h2 className="mt-2 text-3xl font-bold tracking-tight" id="course-curriculum-title">เส้นทางการเรียน</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
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

              <Separator />
              <section id="course-overview" className="scroll-mt-24" aria-labelledby="course-overview-title">
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">02 / Overview</p>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight" id="course-overview-title">รายละเอียดคอร์ส</h2>
                </div>
                {course.description ? (
                  <div
                    className="rich-content"
                    dangerouslySetInnerHTML={{ __html: getSanitizedRichContentCached(course.description) }}
                  />
                ) : (
                  <p className="rounded-lg border border-dashed p-6 text-muted-foreground">คอร์สนี้ยังไม่มีรายละเอียดเพิ่มเติม</p>
                )}
              </section>

              {instructorName && (
                <section id="course-instructor" className="scroll-mt-24 border-t pt-12" aria-labelledby="course-instructor-title">
                  <div className="mb-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">03 / Instructor</p>
                    <h2 className="mt-2 text-3xl font-bold tracking-tight" id="course-instructor-title">รู้จักผู้สอน</h2>
                  </div>
                  <Card><CardContent className="flex items-center gap-4 p-5">
                    {instructorAvatarUrl ? (
                      <img src={instructorAvatarUrl} alt="" className="size-14 rounded-full object-cover" />
                    ) : (
                      <span className="flex size-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground" aria-hidden="true">
                        {instructorName.charAt(0)}
                      </span>
                    )}
                    <div className="grid gap-1">
                      <span className="text-sm text-muted-foreground">ผู้สอนคอร์สนี้</span>
                      <strong className="text-lg">{instructorName}</strong>
                    </div>
                  </CardContent></Card>
                </section>
              )}

              <div id="course-reviews" className="scroll-mt-24 border-t pt-12">
                <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">{reviewsIndex} / Learner reviews</p>
                <CourseReviewsWrapper courseSlug={course.slug} />
              </div>
            </article>

            <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="สรุปก่อนสมัคร">
              <Card>
                <CardHeader><Badge variant="outline" className="w-fit">Course map</Badge><CardTitle>ข้อมูลคอร์สในหน้าเดียว</CardTitle></CardHeader>
                <CardContent className="space-y-5">
                  <dl className="grid gap-3 text-sm [&_div]:flex [&_div]:justify-between [&_div]:gap-4 [&_dt]:text-muted-foreground [&_dd]:font-medium">
                    <div><dt>บทเรียนทั้งหมด</dt><dd>{course.lessons.length} บท</dd></div>
                    <div><dt>บททดลอง</dt><dd>{freePreviewCount > 0 ? `${freePreviewCount} บท` : 'ไม่มี'}</dd></div>
                    {totalSeconds > 0 && <div><dt>เวลาวิดีโอ</dt><dd>{durationText}</dd></div>}
                    {instructorName && <div><dt>ผู้สอน</dt><dd>{instructorName}</dd></div>}
                  </dl>
                  <Button asChild variant="outline" className="w-full"><a href="#enroll-button-slot">กลับไปสมัครคอร์ส ↑</a></Button>
                </CardContent>
              </Card>
            </aside>
          </div>
        </section>
      </main>
      </CourseDetailProvider>

      <Footer />


    </>
  );
}

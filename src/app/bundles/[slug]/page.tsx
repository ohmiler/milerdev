import PaymentCancellationNotice from '@/components/checkout/PaymentCancellationNotice';
import MainContent from '@/components/layout/MainContent';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BundleCourseRow from '@/components/bundle/BundleCourseRow';
import BundleEvidenceSummary from '@/components/bundle/BundleEvidenceSummary';
import BundleEnrollButton from '@/components/bundle/BundleEnrollButton';
import BundlePriceSummary from '@/components/bundle/BundlePriceSummary';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import NavigationBreadcrumbs from '@/components/layout/NavigationBreadcrumbs';
import { auth } from '@/lib/auth';
import { deriveBundleDecisionFacts } from '@/lib/bundle-decision-facts';
import { db } from '@/lib/db';
import {
  bundleCourses,
  bundles,
  courses,
  enrollments,
  lessons,
  reviews,
  users,
} from '@/lib/db/schema';
import { getExcerpt } from '@/lib/sanitize';
import { requirePublishedBundleCourses } from '@/lib/bundle-commerce';
import { absoluteUrl, serializeJsonLd, SITE_URL } from '@/lib/seo';
import { and, asc, avg, count, eq, inArray, sql } from 'drizzle-orm';
import AnalyticsViewEvent from '@/components/analytics/AnalyticsViewEvent';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams?: Promise<{ payment?: string | string[] }>;
  params: Promise<{ slug: string }>;
}

function normalizeUrl(url: string | null): string | null {
  if (!url || url.trim() === '') return null;
  if (url.startsWith('http')) return url;
  return `https://${url}`;
}

async function getBundle(slug: string) {
  const [bundle] = await db
    .select()
    .from(bundles)
    .where(eq(bundles.slug, slug))
    .limit(1);

  if (!bundle || bundle.status !== 'published') return null;

  const lessonStatsSubquery = db
    .select({
      courseId: lessons.courseId,
      lessonCount: count().as('bundle_detail_lesson_count'),
      totalDurationSeconds: sql<number>`COALESCE(SUM(${lessons.videoDuration}), 0)`.as('bundle_detail_duration_seconds'),
      freePreviewCount: sql<number>`COALESCE(SUM(CASE WHEN ${lessons.isFreePreview} = 1 THEN 1 ELSE 0 END), 0)`.as('bundle_detail_preview_count'),
    })
    .from(lessons)
    .groupBy(lessons.courseId)
    .as('bundle_detail_lesson_stats');
  const reviewStatsSubquery = db
    .select({
      courseId: reviews.courseId,
      averageRating: avg(reviews.rating).as('bundle_detail_average_rating'),
      reviewCount: count().as('bundle_detail_review_count'),
    })
    .from(reviews)
    .where(and(eq(reviews.isHidden, false), eq(reviews.isVerified, true)))
    .groupBy(reviews.courseId)
    .as('bundle_detail_review_stats');

  const bCourses = await db
    .select({
      courseId: bundleCourses.courseId,
      orderIndex: bundleCourses.orderIndex,
      courseTitle: courses.title,
      courseSlug: courses.slug,
      coursePrice: courses.price,
      coursePromoPrice: courses.promoPrice,
      coursePromoStartsAt: courses.promoStartsAt,
      coursePromoEndsAt: courses.promoEndsAt,
      courseThumbnail: courses.thumbnailUrl,
      courseDescription: courses.description,
      courseStatus: courses.status,
      courseInstructorName: users.name,
      courseLessonCount: sql<number>`COALESCE(${lessonStatsSubquery.lessonCount}, 0)`.as('bundle_detail_course_lesson_count'),
      courseDurationSeconds: sql<number>`COALESCE(${lessonStatsSubquery.totalDurationSeconds}, 0)`.as('bundle_detail_course_duration_seconds'),
      coursePreviewCount: sql<number>`COALESCE(${lessonStatsSubquery.freePreviewCount}, 0)`.as('bundle_detail_course_preview_count'),
      courseAverageRating: reviewStatsSubquery.averageRating,
      courseReviewCount: sql<number>`COALESCE(${reviewStatsSubquery.reviewCount}, 0)`.as('bundle_detail_course_review_count'),
    })
    .from(bundleCourses)
    .innerJoin(courses, eq(bundleCourses.courseId, courses.id))
    .leftJoin(users, eq(courses.instructorId, users.id))
    .leftJoin(lessonStatsSubquery, eq(courses.id, lessonStatsSubquery.courseId))
    .leftJoin(reviewStatsSubquery, eq(courses.id, reviewStatsSubquery.courseId))
    .where(eq(bundleCourses.bundleId, bundle.id))
    .orderBy(asc(bundleCourses.orderIndex));

  try {
    requirePublishedBundleCourses(bCourses.map((course) => ({
      id: course.courseId,
      status: course.courseStatus,
    })));
  } catch {
    return null;
  }

  return {
    ...bundle,
    courses: bCourses,
  };
}

function getBundleDecisionFacts(
  bundle: NonNullable<Awaited<ReturnType<typeof getBundle>>>,
  options: { now: Date; ownedCourseIds?: ReadonlySet<string> },
) {
  return deriveBundleDecisionFacts({
    slug: bundle.slug,
    price: bundle.price,
    courses: bundle.courses.map((course) => ({
      id: course.courseId,
      title: course.courseTitle,
      slug: course.courseSlug,
      orderIndex: course.orderIndex,
      regularPrice: course.coursePrice,
      promotion: course.coursePromoPrice === null
        ? null
        : {
            price: course.coursePromoPrice,
            startsAt: course.coursePromoStartsAt,
            endsAt: course.coursePromoEndsAt,
          },
      lessonCount: Number(course.courseLessonCount) || 0,
      knownDurationSeconds: Number(course.courseDurationSeconds) || 0,
      freePreviewCount: Number(course.coursePreviewCount) || 0,
      instructor: course.courseInstructorName
        ? { name: course.courseInstructorName }
        : null,
      verifiedReview: Number(course.courseReviewCount) > 0
        ? {
            average: course.courseAverageRating ?? 0,
            count: Number(course.courseReviewCount),
          }
        : null,
      owned: options.ownedCourseIds?.has(course.courseId) ?? false,
    })),
  }, { now: options.now });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await getBundle(slug);
  if (!bundle) return { title: 'ไม่พบ Bundle' };
  const decisionFacts = getBundleDecisionFacts(bundle, { now: new Date() });

  const description = bundle.description
    ? getExcerpt(bundle.description, 160)
    : `รวม ${decisionFacts.evidence.courseCount} คอร์สในชุดเดียว ${decisionFacts.price.comparison.label}`;
  const thumbnailUrl = normalizeUrl(bundle.thumbnailUrl);

  return {
    title: bundle.title,
    description,
    alternates: { canonical: `/bundles/${slug}` },
    openGraph: {
      type: 'website',
      title: bundle.title,
      description,
      url: `/bundles/${slug}`,
      siteName: 'MilerDev',
      ...(thumbnailUrl && {
        images: [{ url: thumbnailUrl, width: 1200, height: 630, alt: bundle.title }],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: bundle.title,
      description,
      ...(thumbnailUrl && { images: [thumbnailUrl] }),
    },
  };
}

export default async function BundleDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const cancelled = (await searchParams)?.payment === 'cancelled';
  const bundle = await getBundle(slug);

  if (!bundle) notFound();

  const session = await auth();
  let ownedCourseIds = new Set<string>();
  if (session?.user && bundle.courses.length > 0) {
    const enrollmentRows = await db
      .select({ courseId: enrollments.courseId })
      .from(enrollments)
      .where(and(
        eq(enrollments.userId, session.user.id),
        inArray(enrollments.courseId, bundle.courses.map((course) => course.courseId)),
      ));
    ownedCourseIds = new Set(enrollmentRows.map((enrollment) => enrollment.courseId));
  }
  const decisionFacts = getBundleDecisionFacts(bundle, { now: new Date(), ownedCourseIds });
  const courseContentById = new Map(bundle.courses.map((course) => [course.courseId, course]));
  const bundleDescription = bundle.description
    ? getExcerpt(bundle.description, 160)
    : `รวม ${decisionFacts.evidence.courseCount} คอร์สในชุดเดียว ${decisionFacts.price.comparison.label}`;
  const bundleThumbnailUrl = normalizeUrl(bundle.thumbnailUrl);
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: bundle.title,
    description: bundleDescription,
    url: absoluteUrl(`/bundles/${slug}`),
    inLanguage: 'th-TH',
    category: 'ชุดคอร์สออนไลน์',
    ...(bundleThumbnailUrl && { image: bundleThumbnailUrl }),
    brand: { '@id': `${SITE_URL}/#organization` },
    offers: {
      '@type': 'Offer',
      price: decisionFacts.price.bundle,
      priceCurrency: 'THB',
      availability: decisionFacts.readiness === 'ready' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: absoluteUrl(`/bundles/${slug}`),
    },
    hasPart: decisionFacts.courses.map((course) => ({
      '@type': 'Course',
      name: course.title,
      url: absoluteUrl(`/courses/${course.slug}`),
    })),
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'หน้าแรก', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'คอร์สทั้งหมด', item: absoluteUrl('/courses') },
      { '@type': 'ListItem', position: 3, name: bundle.title, item: absoluteUrl(`/bundles/${slug}`) },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(productJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }} />
      <Navbar />
      <AnalyticsViewEvent productType="bundle" productId={bundle.id}>
        <MainContent className="min-h-screen bg-background text-foreground">
          {cancelled ? <PaymentCancellationNotice /> : null}
        <header className="border-b bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <NavigationBreadcrumbs
              className="mb-10"
              items={[
                { href: '/', label: 'หน้าแรก' },
                { href: '/courses', label: 'คอร์สทั้งหมด' },
                { label: bundle.title },
              ]}
            />

            <div className={'flex flex-col gap-8'}>
              <div>
                <Badge variant={'outline'}>
                  ชุดคอร์ส · {decisionFacts.evidence.courseCount} คอร์ส
                </Badge>
                <h1 className={'mt-5 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl'}>
                  {bundle.title}
                </h1>
                {bundle.description ? (
                  <p className={'mt-5 max-w-3xl text-lg leading-8 text-muted-foreground'}>
                    {bundle.description}
                  </p>
                ) : null}
              </div>

              <BundleEvidenceSummary evidence={decisionFacts.evidence} />
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_23rem]">
            <div className="min-w-0">
              <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">เส้นทางการเรียนในชุดนี้</h2>
                </div>
                <p className="max-w-md text-sm leading-6 text-muted-foreground">เรียงตามลำดับที่วางไว้ เปิดดูรายละเอียดแต่ละคอร์สได้ก่อนตัดสินใจ</p>
              </div>

              <ol className="grid gap-5">
                {decisionFacts.courses.map((course, index) => {
                  const courseContent = courseContentById.get(course.id);
                  return (
                    <li key={course.id}>
                      <BundleCourseRow
                        course={course}
                        description={courseContent?.courseDescription ?? null}
                        thumbnailUrl={courseContent?.courseThumbnail ?? null}
                        position={index + 1}
                      />
                    </li>
                  );
                })}
              </ol>
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start" aria-label={'สรุปและสมัครชุดคอร์ส'}>
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">เริ่มเส้นทางนี้</CardTitle>
                </CardHeader>

                <CardContent className="flex flex-col gap-6">
                  <BundlePriceSummary price={decisionFacts.price} />

                  <dl className="grid gap-3 text-sm [&_div]:flex [&_div]:justify-between [&_div]:gap-4 [&_dt]:text-muted-foreground [&_dd]:font-medium">
                    <div><dt>คอร์สทั้งหมด</dt><dd>{decisionFacts.evidence.courseCount} คอร์ส</dd></div>
                    <div><dt>เนื้อหาทั้งหมด</dt><dd>{decisionFacts.evidence.totalLessons} บทเรียน</dd></div>
                    <div><dt>Certificate</dt><dd>ทุกคอร์ส</dd></div>
                    <div><dt>การเข้าถึง</dt><dd>ตลอดชีพ</dd></div>
                  </dl>

                  <BundleEnrollButton
                    bundleId={bundle.id}
                    bundleSlug={bundle.slug}
                    decisionFacts={{
                      price: decisionFacts.price,
                      ownership: decisionFacts.ownership,
                      actions: decisionFacts.actions,
                    }}
                  />
                </CardContent>
                <CardFooter><p className="text-xs leading-5 text-muted-foreground">ตรวจสอบคอร์สและยอดชำระก่อนยืนยัน ระบบจะเปิดสิทธิ์หลังการชำระเงินได้รับการตรวจสอบแล้ว</p></CardFooter>
              </Card>
            </aside>
          </div>
        </section>
        </MainContent>
      </AnalyticsViewEvent>
      <Footer />
    </>
  );
}

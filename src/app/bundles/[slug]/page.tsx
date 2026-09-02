import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BundleEnrollButton from '@/components/bundle/BundleEnrollButton';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import NavigationBreadcrumbs from '@/components/layout/NavigationBreadcrumbs';
import { auth } from '@/lib/auth';
import { deriveBundleDecisionFacts } from '@/lib/bundle-decision-facts';
import { db } from '@/lib/db';
import { bundleCourses, bundles, courses, enrollments, lessons } from '@/lib/db/schema';
import { getExcerpt } from '@/lib/sanitize';
import { requirePublishedBundleCourses } from '@/lib/bundle-commerce';
import { absoluteUrl, serializeJsonLd, SITE_URL } from '@/lib/seo';
import { and, asc, count, eq, inArray } from 'drizzle-orm';
import AnalyticsViewEvent from '@/components/analytics/AnalyticsViewEvent';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

interface Props {
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
    })
    .from(bundleCourses)
    .innerJoin(courses, eq(bundleCourses.courseId, courses.id))
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

  const coursesWithLessons = await Promise.all(
    bCourses.map(async (course) => {
      const [result] = await db
        .select({ lessonCount: count() })
        .from(lessons)
        .where(eq(lessons.courseId, course.courseId));
      return { ...course, lessonCount: result?.lessonCount || 0 };
    }),
  );

  return {
    ...bundle,
    courses: coursesWithLessons,
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
      lessonCount: course.lessonCount,
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

export default async function BundleDetailPage({ params }: Props) {
  const { slug } = await params;
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
        <main id="main-content" tabIndex={-1} className="min-h-screen bg-background text-foreground">
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

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-end">
              <div>
                <Badge variant="outline">LEARNING PATH / {String(decisionFacts.evidence.courseCount).padStart(2, '0')} COURSES</Badge>
                <h1 className="mt-5 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">{bundle.title}</h1>
                {bundle.description ? <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">{bundle.description}</p> : null}
              </div>

              <dl className="grid grid-cols-2 gap-3" aria-label={'ข้อมูลชุดคอร์ส'}>
                <div className="flex flex-col gap-1 rounded-lg border bg-background p-4">
                  <dt className="text-sm text-muted-foreground">คอร์ส</dt>
                  <dd className="text-lg font-semibold">{decisionFacts.evidence.courseCount}</dd>
                </div>
                <div className="flex flex-col gap-1 rounded-lg border bg-background p-4">
                  <dt className="text-sm text-muted-foreground">บทเรียน</dt>
                  <dd className="text-lg font-semibold">{decisionFacts.evidence.totalLessons}</dd>
                </div>
                <div className="flex flex-col gap-1 rounded-lg border bg-background p-4">
                  <dt className="text-sm text-muted-foreground">ราคาชุด</dt>
                  <dd className="text-lg font-semibold">{decisionFacts.price.isFree ? 'ฟรี' : decisionFacts.price.bundleFormatted}</dd>
                </div>
                <div className="flex flex-col gap-1 rounded-lg border bg-background p-4">
                  <dt className="text-sm text-muted-foreground">เทียบซื้อแยกวันนี้</dt>
                  <dd className="text-lg font-semibold">
                    {decisionFacts.price.comparison.kind === 'savings'
                      ? `${decisionFacts.price.comparison.percent}%`
                      : decisionFacts.price.comparison.kind === 'equal' ? 'เท่ากัน' : 'ซื้อแยกถูกกว่า'}
                  </dd>
                </div>
              </dl>
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
                  const thumbnail = normalizeUrl(courseContent?.courseThumbnail ?? null);
                  return (
                    <li key={course.id}>
                      <Card className="overflow-hidden transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                      <Link className="grid sm:grid-cols-[12rem_minmax(0,1fr)]" href={`/courses/${course.slug}`}>
                        <div
                          className="flex min-h-40 items-start bg-slate-900 bg-cover bg-center p-4"
                          style={thumbnail ? { backgroundImage: `url(${thumbnail})` } : undefined}
                          aria-hidden={true}
                        >
                          <Badge>{String(index + 1).padStart(2, '0')}</Badge>
                        </div>
                        <div className="p-5">
                          <div className="mb-3 flex flex-wrap justify-between gap-2 text-xs font-semibold text-muted-foreground">
                            <span>คอร์สที่ {index + 1}</span>
                            <span>{course.lessonCount} บทเรียน</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-semibold tracking-tight">{course.title}</h3>
                            {course.owned ? <Badge variant="secondary">มีสิทธิ์เรียนแล้ว</Badge> : null}
                          </div>
                          {courseContent?.courseDescription ? (
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{getExcerpt(courseContent.courseDescription, 120)}</p>
                          ) : null}
                          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm">
                            <span>ซื้อแยกวันนี้ {course.price.effectiveFormatted}</span>
                            <strong>ดูรายละเอียด <span aria-hidden={true}>→</span></strong>
                          </div>
                        </div>
                      </Link></Card>
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
                <div className="rounded-lg bg-muted p-5">
                  <span className="text-sm text-muted-foreground">ราคาชุดคอร์ส</span>
                  <strong className="mt-1 block text-3xl tracking-tight">{decisionFacts.price.isFree ? 'ฟรี' : decisionFacts.price.bundleFormatted}</strong>
                  <p className="mt-2 flex flex-col gap-1 text-sm">
                    <span className="text-muted-foreground">ซื้อแยกวันนี้ {decisionFacts.price.separateCurrentFormatted}</span>
                    <b className={decisionFacts.price.comparison.kind === 'savings' ? 'text-primary' : undefined}>
                      {decisionFacts.price.comparison.label}
                    </b>
                  </p>
                </div>

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
        </main>
      </AnalyticsViewEvent>
      <Footer />
    </>
  );
}

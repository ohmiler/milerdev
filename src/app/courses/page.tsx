import MainContent from '@/components/layout/MainContent';
import SectionHeader from '@/components/layout/SectionHeader';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import BundleCard from '@/components/bundle/BundleCard';
import CourseCard from '@/components/course/CourseCard';
import {
  CourseCatalogActiveFilters,
  CourseCatalogSearch,
  CourseCatalogTopics,
  type CatalogTopic,
} from '@/components/course/CourseCatalogFilters';
import CourseCatalogPagination from '@/components/course/CourseCatalogPagination';
import CatalogSortSelect from '@/components/course/CourseCatalogSort';
import { FeedbackState } from '@/components/status/FeedbackState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { bundles, bundleCourses, courses, courseTags, lessons, reviews, tags, users } from '@/lib/db/schema';
import {
  deriveBundleDecisionFacts,
  type BundleCourseDecisionSource,
  type BundleDecisionFacts,
} from '@/lib/commerce/bundle-decision-facts';
import { deriveCourseDecisionFacts, type CourseDecisionFacts } from '@/lib/commerce/course-decision-facts';
import {
  buildCourseCatalogHref,
  clampCourseCatalogPage,
  normalizeCourseCatalogQuery,
  type CourseCatalogPreview,
  type CourseCatalogPrice,
  type CourseCatalogQueryInput,
  type CourseCatalogSort,
} from '@/lib/courses/catalog-query';
import { and, asc, avg, count, desc, eq, like, sql } from 'drizzle-orm';

export const revalidate = 300;

type Props = {
  searchParams?: Promise<CourseCatalogQueryInput>;
};

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface CourseListItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  decisionFacts: CourseDecisionFacts;
  tags: Tag[];
}

interface BundleItem {
  id: string;
  title: string;
  description: string | null;
  decisionFacts: BundleDecisionFacts;
}

function getSingleParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolved = searchParams ? await searchParams : {};
  const search = getSingleParam(resolved.search).trim();
  const price = getSingleParam(resolved.price) || 'all';
  const tag = getSingleParam(resolved.tag) || 'all';
  const sort = getSingleParam(resolved.sort) || 'newest';
  const page = Math.max(1, parseInt(getSingleParam(resolved.page) || '1', 10) || 1);
  const preview = getSingleParam(resolved.preview) || 'all';
  const hasFacets = !!search || price !== 'all' || tag !== 'all' || preview !== 'all' || sort !== 'newest' || page > 1;

  return {
    title: search ? `ผลการค้นหา "${search}"` : 'คอร์สเขียนโปรแกรมออนไลน์ภาษาไทย',
    alternates: { canonical: '/courses' },
    robots: hasFacets ? { index: false, follow: true } : { index: true, follow: true },
  };
}

async function getAllTags(): Promise<Tag[]> {
  return db.select({ id: tags.id, name: tags.name, slug: tags.slug }).from(tags).orderBy(tags.name);
}

// Topics are the tags that published courses carry, most used first, so a new topic shows up by itself.
async function getCatalogTopics(): Promise<{ topics: CatalogTopic[]; publishedCount: number }> {
  const courseCount = count(courses.id);
  const [topicRows, publishedRows] = await Promise.all([
    db
      .select({ slug: tags.slug, name: tags.name, count: courseCount })
      .from(tags)
      .innerJoin(courseTags, eq(courseTags.tagId, tags.id))
      .innerJoin(courses, and(eq(courses.id, courseTags.courseId), eq(courses.status, 'published')))
      .groupBy(tags.id, tags.slug, tags.name)
      .orderBy(desc(courseCount), asc(tags.name)),
    db.select({ total: count() }).from(courses).where(eq(courses.status, 'published')),
  ]);

  return {
    topics: topicRows.map((row) => ({ slug: row.slug, name: row.name, count: Number(row.count) })),
    publishedCount: Number(publishedRows[0]?.total ?? 0),
  };
}

async function getPublishedBundles(now: Date): Promise<BundleItem[]> {
  const lessonStatsSubquery = db
    .select({
      courseId: lessons.courseId,
      lessonCount: count().as('bundle_lesson_count'),
    })
    .from(lessons)
    .groupBy(lessons.courseId)
    .as('bundle_lesson_stats');
  const rows = await db
    .select({
      id: bundles.id,
      title: bundles.title,
      slug: bundles.slug,
      description: bundles.description,
      price: bundles.price,
      createdAt: bundles.createdAt,
      courseId: courses.id,
      courseTitle: courses.title,
      courseSlug: courses.slug,
      coursePrice: courses.price,
      coursePromoPrice: courses.promoPrice,
      coursePromoStartsAt: courses.promoStartsAt,
      coursePromoEndsAt: courses.promoEndsAt,
      courseLessonCount: sql<number>`COALESCE(${lessonStatsSubquery.lessonCount}, 0)`.as('bundle_course_lesson_count'),
      orderIndex: bundleCourses.orderIndex,
    })
    .from(bundles)
    .leftJoin(bundleCourses, eq(bundles.id, bundleCourses.bundleId))
    .leftJoin(courses, eq(bundleCourses.courseId, courses.id))
    .leftJoin(lessonStatsSubquery, eq(courses.id, lessonStatsSubquery.courseId))
    .where(eq(bundles.status, 'published'))
    .orderBy(asc(bundles.createdAt), asc(bundleCourses.orderIndex));

  const bundleMap = new Map<string, {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    price: string;
    courses: BundleCourseDecisionSource[];
  }>();

  for (const row of rows) {
    const existing = bundleMap.get(row.id) ?? {
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      price: row.price,
      courses: [],
    };

    if (
      row.courseId
      && row.courseTitle
      && row.courseSlug
      && row.coursePrice !== null
    ) {
      existing.courses.push({
        id: row.courseId,
        title: row.courseTitle,
        slug: row.courseSlug,
        orderIndex: row.orderIndex,
        regularPrice: row.coursePrice,
        promotion: row.coursePromoPrice === null
          ? null
          : {
              price: row.coursePromoPrice,
              startsAt: row.coursePromoStartsAt,
              endsAt: row.coursePromoEndsAt,
            },
        lessonCount: Number(row.courseLessonCount) || 0,
      });
    }

    bundleMap.set(row.id, existing);
  }

  return Array.from(bundleMap.values()).map((bundle) => ({
    id: bundle.id,
    title: bundle.title,
    description: bundle.description,
    decisionFacts: deriveBundleDecisionFacts({
      slug: bundle.slug,
      price: bundle.price,
      courses: bundle.courses,
    }, { now }),
  }));
}

async function getCoursesData(input: {
  page: number;
  limit: number;
  search: string;
  priceFilter: CourseCatalogPrice;
  tagSlug: string;
  previewFilter: CourseCatalogPreview;
  sort: CourseCatalogSort;
  now: Date;
}) {
  const { page, limit, search, priceFilter, tagSlug, previewFilter, sort, now } = input;
  const offset = (page - 1) * limit;
  const conditions = [eq(courses.status, 'published')];
  const effectivePrice = sql<string>`CASE
    WHEN ${courses.promoPrice} IS NOT NULL
      AND (${courses.promoStartsAt} IS NULL OR ${courses.promoStartsAt} <= ${now})
      AND (${courses.promoEndsAt} IS NULL OR ${courses.promoEndsAt} >= ${now})
    THEN ${courses.promoPrice}
    ELSE ${courses.price}
  END`;

  if (search) conditions.push(like(courses.title, `%${search}%`));
  if (priceFilter === 'free') conditions.push(sql`${effectivePrice} = 0`);
  else if (priceFilter === 'paid') conditions.push(sql`${effectivePrice} > 0`);

  if (previewFilter === 'free') {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM lessons l
        WHERE l.course_id = ${courses.id} AND l.is_free_preview = 1
      )`
    );
  }

  if (tagSlug !== 'all') {
    conditions.push(
      sql`${courses.id} IN (
        SELECT ct.course_id FROM course_tags ct
        INNER JOIN tags t ON ct.tag_id = t.id
        WHERE t.slug = ${tagSlug}
      )`
    );
  }

  let orderBy;
  switch (sort) {
    case 'oldest':
      orderBy = asc(courses.createdAt);
      break;
    case 'price-low':
      orderBy = asc(effectivePrice);
      break;
    case 'price-high':
      orderBy = desc(effectivePrice);
      break;
    default:
      orderBy = desc(courses.createdAt);
      break;
  }

  const whereCondition = and(...conditions);
  const lessonStatsSubquery = db
    .select({
      courseId: lessons.courseId,
      lessonCount: count().as('lesson_count'),
      totalDurationSeconds: sql<number>`COALESCE(SUM(${lessons.videoDuration}), 0)`.as('total_duration_seconds'),
      freePreviewCount: sql<number>`COALESCE(SUM(CASE WHEN ${lessons.isFreePreview} = 1 THEN 1 ELSE 0 END), 0)`.as('free_preview_count'),
    })
    .from(lessons)
    .groupBy(lessons.courseId)
    .as('lesson_stats');
  const reviewStatsSubquery = db
    .select({
      courseId: reviews.courseId,
      averageRating: avg(reviews.rating).as('average_rating'),
      reviewCount: count().as('review_count'),
    })
    .from(reviews)
    .where(and(eq(reviews.isHidden, false), eq(reviews.isVerified, true)))
    .groupBy(reviews.courseId)
    .as('review_stats');

  const [courseRows, totalResult] = await Promise.all([
    db
      .select({
        id: courses.id,
        title: courses.title,
        slug: courses.slug,
        description: courses.description,
        thumbnailUrl: courses.thumbnailUrl,
        price: courses.price,
        promoPrice: courses.promoPrice,
        promoStartsAt: courses.promoStartsAt,
        promoEndsAt: courses.promoEndsAt,
        instructorId: courses.instructorId,
        instructorName: users.name,
        instructorAvatarUrl: users.avatarUrl,
        lessonCount: sql<number>`COALESCE(${lessonStatsSubquery.lessonCount}, 0)`.as('lesson_count'),
        totalDurationSeconds: sql<number>`COALESCE(${lessonStatsSubquery.totalDurationSeconds}, 0)`.as('total_duration_seconds'),
        freePreviewCount: sql<number>`COALESCE(${lessonStatsSubquery.freePreviewCount}, 0)`.as('free_preview_count'),
        averageRating: reviewStatsSubquery.averageRating,
        reviewCount: sql<number>`COALESCE(${reviewStatsSubquery.reviewCount}, 0)`.as('review_count'),
      })
      .from(courses)
      .leftJoin(users, eq(courses.instructorId, users.id))
      .leftJoin(lessonStatsSubquery, eq(courses.id, lessonStatsSubquery.courseId))
      .leftJoin(reviewStatsSubquery, eq(courses.id, reviewStatsSubquery.courseId))
      .where(whereCondition)
      .orderBy(orderBy, asc(courses.id))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(courses).where(whereCondition),
  ]);

  const courseIds = courseRows.map((course) => course.id);
  const allCourseTags = courseIds.length > 0
    ? await db
        .select({
          courseId: courseTags.courseId,
          tagId: tags.id,
          tagName: tags.name,
          tagSlug: tags.slug,
        })
        .from(courseTags)
        .innerJoin(tags, eq(courseTags.tagId, tags.id))
        .where(sql`${courseTags.courseId} IN (${sql.join(courseIds.map((id) => sql`${id}`), sql`, `)})`)
    : [];

  const tagsByCourse = new Map<string, Tag[]>();
  for (const row of allCourseTags) {
    if (!tagsByCourse.has(row.courseId)) tagsByCourse.set(row.courseId, []);
    tagsByCourse.get(row.courseId)!.push({ id: row.tagId, name: row.tagName, slug: row.tagSlug });
  }

  const formattedCourses: CourseListItem[] = courseRows.map((row) => {
    const lessonCount = Number(row.lessonCount) || 0;
    const totalDurationSeconds = Number(row.totalDurationSeconds) || 0;
    const freePreviewCount = Number(row.freePreviewCount) || 0;
    const instructor = row.instructorId
      ? { id: row.instructorId, name: row.instructorName, avatarUrl: row.instructorAvatarUrl }
      : null;

    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      thumbnailUrl: row.thumbnailUrl,
      decisionFacts: deriveCourseDecisionFacts({
        slug: row.slug,
        regularPrice: row.price,
        promotion: row.promoPrice === null
          ? null
          : {
              price: row.promoPrice,
              startsAt: row.promoStartsAt,
              endsAt: row.promoEndsAt,
            },
        lessonCount,
        knownDurationSeconds: totalDurationSeconds,
        freePreviewCount,
        instructor,
        verifiedReview: Number(row.reviewCount) > 0
          ? { average: row.averageRating ?? 0, count: Number(row.reviewCount) }
          : null,
      }, { now }),
      tags: tagsByCourse.get(row.id) || [],
    };
  });

  return {
    courses: formattedCourses,
    pagination: {
      page,
      limit,
      total: totalResult[0]?.total ?? 0,
      totalPages: Math.ceil((totalResult[0]?.total ?? 0) / limit),
    },
  };
}

export default async function CoursesPage({ searchParams }: Props) {
  const resolved = searchParams ? await searchParams : {};
  const allTagsPromise = getAllTags();
  const allTags = await allTagsPromise;
  const normalized = normalizeCourseCatalogQuery(
    resolved,
    allTags.map((tag) => tag.slug),
  );

  if (!normalized.isCanonical) {
    redirect(buildCourseCatalogHref(normalized.query));
  }

  const catalogHref = buildCourseCatalogHref(normalized.query);
  const showBundles = catalogHref === '/courses';
  const now = new Date();
  const [coursesData, bundlesList, catalogTopics] = await Promise.all([
    getCoursesData({
      page: normalized.query.page,
      limit: 12,
      search: normalized.query.search,
      priceFilter: normalized.query.price,
      tagSlug: normalized.query.tag,
      previewFilter: normalized.query.preview,
      sort: normalized.query.sort,
      now,
    }),
    showBundles ? getPublishedBundles(now) : Promise.resolve([]),
    getCatalogTopics(),
  ]);
  const canonicalPage = clampCourseCatalogPage(
    normalized.query.page,
    coursesData.pagination.totalPages,
  );

  if (canonicalPage !== normalized.query.page) {
    redirect(buildCourseCatalogHref(normalized.query, { page: canonicalPage }));
  }

  const {
    search,
    price: priceFilter,
    tag: tagFilter,
    preview: previewFilter,
  } = normalized.query;
  const filtering = Boolean(search || priceFilter !== 'all' || tagFilter !== 'all' || previewFilter !== 'all');
  const { courses: courseList, pagination } = coursesData;
  // A valid topic with no published course yet still gets a chip, so the active filter stays visible.
  const activeTag = tagFilter === 'all' || catalogTopics.topics.some((topic) => topic.slug === tagFilter)
    ? null
    : allTags.find((tag) => tag.slug === tagFilter);
  const topics = activeTag
    ? [...catalogTopics.topics, { slug: activeTag.slug, name: activeTag.name, count: 0 }]
    : catalogTopics.topics;
  const listLabel = filtering ? `พบ ${pagination.total} คอร์ส` : `ทั้งหมด ${pagination.total} คอร์ส`;

  return (
    <>
      <Navbar />
      <MainContent key={catalogHref} className="bg-[var(--academy-canvas)]">
        <section className="border-b bg-background" aria-labelledby="courses-catalog-title">
          <div className="container flex flex-col gap-5 py-8 sm:py-10 lg:py-12">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
              <div className="min-w-0 max-w-2xl">
                <h1 id="courses-catalog-title" className="text-h1 font-semibold text-balance">คอร์สทั้งหมด</h1>
                <p className="mt-2 text-lead text-pretty text-muted-foreground">คอร์สเขียนโปรแกรมภาษาไทย เลือกตามหัวข้อ แล้วลองดูบทเรียนทดลองก่อนตัดสินใจ</p>
              </div>
              <div className="w-full lg:max-w-sm">
                <CourseCatalogSearch query={normalized.query} />
              </div>
            </div>
            <CourseCatalogTopics query={normalized.query} topics={topics} total={catalogTopics.publishedCount} />
          </div>
        </section>

        <section id="course-catalog" className="py-8 sm:py-10" aria-labelledby="courses-list-title">
          <div className="container">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h2 id="courses-list-title" className="text-lead font-semibold" aria-live="polite">{listLabel}</h2>
                {filtering ? (
                  <Link href="/courses" className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-link hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
                    ล้างตัวกรอง
                  </Link>
                ) : null}
              </div>
              <CatalogSortSelect query={normalized.query} />
            </div>
            <CourseCatalogActiveFilters query={normalized.query} className="mb-6" />

            {courseList.length === 0 ? (
              <FeedbackState
                state="empty"
                className="border"
                title="ไม่พบคอร์สตามเงื่อนไขนี้"
                description="ลองใช้คำค้นที่สั้นลง หรือเลือกหัวข้ออื่น"
                action={<Button asChild><Link href="/courses">ดูคอร์สทั้งหมด</Link></Button>}
              />
            ) : (
              <>
                <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {courseList.map((course) => (
                    <li key={course.id} className="min-w-0">
                      <CourseCard id={course.id} title={course.title} slug={course.slug} description={course.description} thumbnailUrl={course.thumbnailUrl} decisionFacts={course.decisionFacts} tags={course.tags} />
                    </li>
                  ))}
                </ul>
                <CourseCatalogPagination
                  query={normalized.query}
                  totalPages={pagination.totalPages}
                />
              </>
            )}
          </div>
        </section>

        {showBundles && bundlesList.length > 0 ? (
          <section className="border-t bg-background py-14 sm:py-20" aria-labelledby="courses-bundles-title">
            <div className="container">
              <SectionHeader
                id="courses-bundles-title"
                title="ถ้าอยากเรียนต่อเนื่อง ลองดูแบบชุด"
                description="รวมคอร์สที่ต่อเนื่องกันไว้ในเส้นทางเดียว พร้อมราคาที่เปรียบเทียบได้ชัดเจน"
                action={<Badge variant="secondary">{bundlesList.length} เส้นทาง</Badge>}
                className="mb-8"
              />
              <div className="grid gap-5 lg:grid-cols-2">
                {bundlesList.map((bundle) => (
                  <BundleCard
                    key={bundle.id}
                    title={bundle.title}
                    description={bundle.description}
                    decisionFacts={bundle.decisionFacts}
                  />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="py-10 sm:py-14" aria-labelledby="courses-help-title">
          <div className="container">
            <div className="grid gap-8 rounded-2xl bg-navy px-6 py-10 text-background sm:px-10 sm:py-12 lg:grid-cols-[1fr_auto] lg:items-center lg:px-14">
              <SectionHeader
                id="courses-help-title"
                tone="inverse"
                title="ยังไม่แน่ใจว่าคอร์สไหน เหมาะกับคุณ"
                description="ดูบทเรียนทดลองฟรีได้โดยไม่ต้องสมัครสมาชิก หรือเล่าเป้าหมายของคุณให้ทีมงานช่วยแนะนำ"
              />
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Button asChild size="lg">
                  <Link href="/contact">ถามทีมงาน</Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/faq">คำถามที่พบบ่อย</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </MainContent>
      <Footer />
    </>
  );
}

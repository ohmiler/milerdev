import MainContent from '@/components/layout/MainContent';
import PublicPageHeader from '@/components/layout/PublicPageHeader';
import Link from 'next/link';
import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import BundleCard from '@/components/bundle/BundleCard';
import CourseCard from '@/components/course/CourseCard';
import CourseCatalogFilters from '@/components/course/CourseCatalogFilters';
import { FeedbackState } from '@/components/status/FeedbackState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { bundles, bundleCourses, courses, courseTags, lessons, tags, users } from '@/lib/db/schema';
import {
  deriveBundleDecisionFacts,
  type BundleCourseDecisionSource,
  type BundleDecisionFacts,
} from '@/lib/bundle-decision-facts';
import { deriveCourseDecisionFacts, type CourseDecisionFacts } from '@/lib/course-decision-facts';
import { and, asc, count, desc, eq, gt, like, sql } from 'drizzle-orm';

export const revalidate = 300;

type SearchParamsInput = {
  search?: string | string[];
  price?: string | string[];
  tag?: string | string[];
  sort?: string | string[];
  page?: string | string[];
};

type Props = {
  searchParams?: Promise<SearchParamsInput>;
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

function buildCoursesQuery(params: {
  search?: string;
  price?: string;
  tag?: string;
  sort?: string;
  page?: number;
}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.price && params.price !== 'all') query.set('price', params.price);
  if (params.tag && params.tag !== 'all') query.set('tag', params.tag);
  if (params.sort && params.sort !== 'newest') query.set('sort', params.sort);
  if (params.page && params.page > 1) query.set('page', String(params.page));
  const output = query.toString();
  return output ? `/courses?${output}` : '/courses';
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolved = searchParams ? await searchParams : {};
  const search = getSingleParam(resolved.search).trim();
  const price = getSingleParam(resolved.price) || 'all';
  const tag = getSingleParam(resolved.tag) || 'all';
  const sort = getSingleParam(resolved.sort) || 'newest';
  const page = Math.max(1, parseInt(getSingleParam(resolved.page) || '1', 10) || 1);
  const hasFacets = !!search || price !== 'all' || tag !== 'all' || sort !== 'newest' || page > 1;

  return {
    title: search ? `ผลการค้นหา "${search}"` : 'คอร์สเขียนโปรแกรมออนไลน์ภาษาไทย',
    alternates: { canonical: '/courses' },
    robots: hasFacets ? { index: false, follow: true } : { index: true, follow: true },
  };
}

async function getAllTags(): Promise<Tag[]> {
  return db.select({ id: tags.id, name: tags.name, slug: tags.slug }).from(tags).orderBy(tags.name);
}

async function getPublishedBundles(): Promise<BundleItem[]> {
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

  const now = new Date();
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
  priceFilter: string;
  tagSlug: string;
  sort: string;
}) {
  const { page, limit, search, priceFilter, tagSlug, sort } = input;
  const offset = (page - 1) * limit;
  const conditions = [eq(courses.status, 'published')];

  if (search) conditions.push(like(courses.title, `%${search}%`));
  if (priceFilter === 'free') conditions.push(eq(courses.price, '0'));
  else if (priceFilter === 'paid') conditions.push(gt(courses.price, '0'));

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
      orderBy = asc(courses.price);
      break;
    case 'price-high':
      orderBy = desc(courses.price);
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
      })
      .from(courses)
      .leftJoin(users, eq(courses.instructorId, users.id))
      .leftJoin(lessonStatsSubquery, eq(courses.id, lessonStatsSubquery.courseId))
      .where(whereCondition)
      .orderBy(orderBy)
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

  const now = new Date();
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
  const search = getSingleParam(resolved.search).trim();
  const priceFilter = getSingleParam(resolved.price) || 'all';
  const tagFilter = getSingleParam(resolved.tag) || 'all';
  const sort = getSingleParam(resolved.sort) || 'newest';
  const currentPage = Math.max(1, parseInt(getSingleParam(resolved.page) || '1', 10) || 1);
  const hasActiveFilters = Boolean(
    search
      || priceFilter !== 'all'
      || tagFilter !== 'all'
      || sort !== 'newest'
      || currentPage > 1,
  );

  const [coursesData, allTags, bundlesList] = await Promise.all([
    getCoursesData({ page: currentPage, limit: 12, search, priceFilter, tagSlug: tagFilter, sort }),
    getAllTags(),
    getPublishedBundles(),
  ]);

  const { courses: courseList, pagination } = coursesData;

  return (
    <>
      <Navbar />
      <MainContent key={buildCoursesQuery({ search, price: priceFilter, tag: tagFilter, sort })} className="bg-[var(--academy-canvas)]">
        <PublicPageHeader
          title="เลือกคอร์สที่พาไปถึงงานชิ้นถัดไป"
          description="เปรียบเทียบหัวข้อ ราคา และบทเรียนที่เปิดให้ทดลอง แล้วเลือกจุดเริ่มต้นที่ตรงกับทักษะที่คุณอยากพัฒนาจริง"
          variant="catalog"
        />

        <section id="course-catalog" className="py-14 sm:py-20" aria-labelledby="courses-catalog-title">
          <div className="container">
            <header className="mb-8 grid gap-4 border-b pb-7 md:grid-cols-[1fr_auto] md:items-end">
              <div><h2 id="courses-catalog-title" className="text-3xl font-semibold tracking-[-.03em] sm:text-4xl">คอร์สทั้งหมด</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">ใช้ตัวกรองเพื่อย่อรายการ แล้วดูรายละเอียดจริงของแต่ละคอร์สก่อนตัดสินใจ</p></div>
              <Badge variant="secondary" aria-live="polite">พบ {pagination.total} คอร์ส</Badge>
            </header>

            <CourseCatalogFilters
              tags={allTags}
              search={search}
              priceFilter={priceFilter}
              tagFilter={tagFilter}
              sort={sort}
              totalCourses={pagination.total}
              hasActiveFilters={hasActiveFilters}
            />

            <div className="mb-6 flex items-center justify-between gap-4"><p className="font-semibold">{search ? `ผลการค้นหาสำหรับ “${search}”` : 'หลักสูตรที่เปิดให้เรียน'}</p><span className="text-sm text-muted-foreground">หน้า {pagination.page} / {Math.max(1, pagination.totalPages)}</span></div>

            {courseList.length === 0 ? (
              <FeedbackState
                state="empty"
                className="border"
                title="ไม่พบคอร์สตามเงื่อนไขนี้"
                description="ลองใช้คำค้นที่สั้นลง หรือเลือกหัวข้อและราคาใหม่"
                action={<Button asChild><Link href="/courses">ดูคอร์สทั้งหมด</Link></Button>}
              />
            ) : (
              <>
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{courseList.map((course) => <CourseCard key={course.id} id={course.id} title={course.title} slug={course.slug} description={course.description} thumbnailUrl={course.thumbnailUrl} decisionFacts={course.decisionFacts} tags={course.tags} />)}</div>
                {pagination.totalPages > 1 ? <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="หน้ารายการคอร์ส">{currentPage > 1 ? <Button variant="outline" asChild><Link href={buildCoursesQuery({ search, price: priceFilter, tag: tagFilter, sort, page: currentPage - 1 })}>← ก่อนหน้า</Link></Button> : null}{Array.from({ length: Math.min(5, pagination.totalPages) }, (_, index) => { let pageNumber; if (pagination.totalPages <= 5) pageNumber = index + 1; else if (currentPage <= 3) pageNumber = index + 1; else if (currentPage >= pagination.totalPages - 2) pageNumber = pagination.totalPages - 4 + index; else pageNumber = currentPage - 2 + index; const isActive = currentPage === pageNumber; return <Button key={pageNumber} variant={isActive ? 'default' : 'outline'} size="icon-sm" asChild><Link href={buildCoursesQuery({ search, price: priceFilter, tag: tagFilter, sort, page: pageNumber })} aria-current={isActive ? 'page' : undefined}>{pageNumber}</Link></Button>; })}{currentPage < pagination.totalPages ? <Button variant="outline" asChild><Link href={buildCoursesQuery({ search, price: priceFilter, tag: tagFilter, sort, page: currentPage + 1 })}>ถัดไป →</Link></Button> : null}</nav> : null}
              </>
            )}
          </div>
        </section>

        {bundlesList.length > 0 ? (
          <section className="border-t bg-background py-14 sm:py-20" aria-labelledby="courses-bundles-title">
            <div className="container">
              <header className="mb-8 grid gap-4 md:grid-cols-[1fr_auto] md:items-end"><div><h2 id="courses-bundles-title" className="text-3xl font-semibold tracking-[-.03em] sm:text-4xl">ถ้าอยากเรียนต่อเนื่อง ลองดูแบบชุด</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">รวมคอร์สที่ต่อเนื่องกันไว้ในเส้นทางเดียว พร้อมราคาที่เปรียบเทียบได้ชัดเจน</p></div><Badge variant="secondary">{bundlesList.length} เส้นทาง</Badge></header>
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
      </MainContent>
      <Footer />
    </>
  );
}

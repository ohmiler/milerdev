import Link from 'next/link';
import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CourseCard from '@/components/course/CourseCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/db';
import { bundles, bundleCourses, courses, courseTags, lessons, tags, users } from '@/lib/db/schema';
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
  price: string;
  promoPrice: string | null;
  isPromoActive: boolean;
  instructor: { id: string; name: string | null; avatarUrl: string | null } | null;
  lessonCount: number;
  totalDurationSeconds: number;
  hasFreePreview: boolean;
  tags: Tag[];
}

interface BundleItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: string;
  courseCount: number;
  totalOriginalPrice: number;
  discount: number;
  courses: { courseTitle: string }[];
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
    title: search ? `ผลการค้นหา "${search}"` : 'คอร์สทั้งหมด',
    alternates: { canonical: '/courses' },
    robots: hasFacets ? { index: false, follow: true } : { index: true, follow: true },
  };
}

async function getAllTags(): Promise<Tag[]> {
  return db.select({ id: tags.id, name: tags.name, slug: tags.slug }).from(tags).orderBy(tags.name);
}

async function getPublishedBundles(): Promise<BundleItem[]> {
  const rows = await db
    .select({
      id: bundles.id,
      title: bundles.title,
      slug: bundles.slug,
      description: bundles.description,
      price: bundles.price,
      createdAt: bundles.createdAt,
      courseTitle: courses.title,
      coursePrice: courses.price,
      orderIndex: bundleCourses.orderIndex,
    })
    .from(bundles)
    .leftJoin(bundleCourses, eq(bundles.id, bundleCourses.bundleId))
    .leftJoin(courses, eq(bundleCourses.courseId, courses.id))
    .where(eq(bundles.status, 'published'))
    .orderBy(asc(bundles.createdAt), asc(bundleCourses.orderIndex));

  const bundleMap = new Map<string, {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    price: string;
    courses: { courseTitle: string }[];
    totalOriginalPrice: number;
  }>();

  for (const row of rows) {
    const existing = bundleMap.get(row.id) ?? {
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      price: row.price,
      courses: [],
      totalOriginalPrice: 0,
    };

    if (row.courseTitle) {
      existing.courses.push({ courseTitle: row.courseTitle });
      existing.totalOriginalPrice += parseFloat(row.coursePrice || '0');
    }

    bundleMap.set(row.id, existing);
  }

  return Array.from(bundleMap.values()).map((bundle) => ({
    ...bundle,
    courseCount: bundle.courses.length,
    discount: bundle.totalOriginalPrice > 0
      ? Math.round((1 - parseFloat(bundle.price) / bundle.totalOriginalPrice) * 100)
      : 0,
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
    const hasPromo = row.promoPrice !== null && row.promoPrice !== undefined;
    const promoStartOk = !row.promoStartsAt || new Date(row.promoStartsAt) <= now;
    const promoEndOk = !row.promoEndsAt || new Date(row.promoEndsAt) >= now;
    const isPromoActive = hasPromo && promoStartOk && promoEndOk;

    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      thumbnailUrl: row.thumbnailUrl,
      price: row.price,
      promoPrice: row.promoPrice,
      isPromoActive,
      instructor: row.instructorId
        ? { id: row.instructorId, name: row.instructorName, avatarUrl: row.instructorAvatarUrl }
        : null,
      lessonCount: Number(row.lessonCount) || 0,
      totalDurationSeconds: Number(row.totalDurationSeconds) || 0,
      hasFreePreview: Number(row.freePreviewCount) > 0,
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

  const selectClass = 'h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30';

  return (
    <>
      <Navbar />
      <main key={buildCoursesQuery({ search, price: priceFilter, tag: tagFilter, sort })} className="bg-[var(--academy-canvas)]">
        <header className="border-b bg-[radial-gradient(circle_at_12%_10%,var(--color-accent-soft),transparent_34%),var(--academy-canvas)] py-16 sm:py-20 lg:py-24">
          <div className="container">
            <p className="mb-5 font-mono text-xs font-semibold tracking-[.18em] text-primary uppercase">Course directory / {String(pagination.total).padStart(2, '0')}</p>
            <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr] lg:items-end lg:gap-16">
              <h1 className="max-w-4xl text-4xl leading-[1.15] font-semibold tracking-[-.04em] text-balance sm:text-5xl lg:text-6xl">เลือกคอร์สที่พาไปถึงงานชิ้นถัดไป</h1>
              <p className="max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">เปรียบเทียบหัวข้อ ราคา และบทเรียนที่เปิดให้ทดลอง แล้วเลือกจุดเริ่มต้นที่ตรงกับทักษะที่คุณอยากพัฒนาจริง</p>
            </div>
          </div>
        </header>

        <section id="course-catalog" className="py-14 sm:py-20" aria-labelledby="courses-catalog-title">
          <div className="container">
            <header className="mb-8 grid gap-4 border-b pb-7 md:grid-cols-[9rem_1fr_auto] md:items-end">
              <p className="font-mono text-xs tracking-[.14em] text-primary uppercase">01 / Course catalog</p>
              <div><h2 id="courses-catalog-title" className="text-3xl font-semibold tracking-[-.03em] sm:text-4xl">คอร์สทั้งหมด</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">ใช้ตัวกรองเพื่อย่อรายการ แล้วดูรายละเอียดจริงของแต่ละคอร์สก่อนตัดสินใจ</p></div>
              <Badge variant="secondary" aria-live="polite">พบ {pagination.total} คอร์ส</Badge>
            </header>

            <Card className="mb-10 shadow-[var(--academy-shadow-card)]" aria-label="ตัวกรองคอร์ส">
              <CardHeader><p className="font-mono text-xs tracking-[.14em] text-primary uppercase">Filter desk</p><CardTitle>คัดให้เหลือสิ่งที่ใช่</CardTitle></CardHeader>
              <CardContent>
                <form method="GET" action="/courses" className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(16rem,1.5fr)_repeat(3,minmax(9rem,.65fr))_auto] xl:items-end">
                  <div className="space-y-2"><Label htmlFor="course-search">ค้นหาจากชื่อคอร์ส</Label><Input id="course-search" type="search" name="search" defaultValue={search} placeholder="เช่น JavaScript, React" /></div>
                  <div className="space-y-2"><Label htmlFor="course-price">ราคา</Label><select className={selectClass} id="course-price" name="price" defaultValue={priceFilter}><option value="all">ทุกราคา</option><option value="free">ฟรี</option><option value="paid">มีค่าใช้จ่าย</option></select></div>
                  <div className="space-y-2"><Label htmlFor="course-tag">หัวข้อ</Label><select className={selectClass} id="course-tag" name="tag" defaultValue={tagFilter}><option value="all">ทุกหัวข้อ</option>{allTags.map((tag) => <option key={tag.id} value={tag.slug}>{tag.name}</option>)}</select></div>
                  <div className="space-y-2"><Label htmlFor="course-sort">เรียงตาม</Label><select className={selectClass} id="course-sort" name="sort" defaultValue={sort}><option value="newest">ใหม่ล่าสุด</option><option value="oldest">เก่าสุด</option><option value="price-low">ราคาต่ำไปสูง</option><option value="price-high">ราคาสูงไปต่ำ</option></select></div>
                  <div className="flex gap-2"><Button type="submit">แสดงผลลัพธ์</Button>{hasActiveFilters ? <Button variant="outline" asChild><Link href="/courses">ล้าง</Link></Button> : null}</div>
                </form>
              </CardContent>
            </Card>

            <div className="mb-6 flex items-center justify-between gap-4"><p className="font-semibold">{search ? `ผลการค้นหาสำหรับ “${search}”` : 'หลักสูตรที่เปิดให้เรียน'}</p><span className="text-sm text-muted-foreground">หน้า {pagination.page} / {Math.max(1, pagination.totalPages)}</span></div>

            {courseList.length === 0 ? (
              <Card className="items-center py-14 text-center"><CardContent><p className="font-mono text-xs tracking-[.14em] text-primary uppercase">No matching courses</p><h3 className="mt-3 text-2xl font-semibold">ไม่พบคอร์สตามเงื่อนไขนี้</h3><p className="mt-2 text-muted-foreground">ลองใช้คำค้นที่สั้นลง หรือเลือกหัวข้อและราคาใหม่</p><Button className="mt-6" asChild><Link href="/courses">ดูคอร์สทั้งหมด</Link></Button></CardContent></Card>
            ) : (
              <>
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{courseList.map((course) => <CourseCard key={course.id} id={course.id} title={course.title} slug={course.slug} description={course.description} thumbnailUrl={course.thumbnailUrl} price={parseFloat(course.price || '0')} promoPrice={course.promoPrice ? parseFloat(course.promoPrice) : null} isPromoActive={course.isPromoActive} instructorName={course.instructor?.name || null} lessonCount={course.lessonCount} totalDurationSeconds={course.totalDurationSeconds} hasFreePreview={course.hasFreePreview} tags={course.tags} />)}</div>
                {pagination.totalPages > 1 ? <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="หน้ารายการคอร์ส">{currentPage > 1 ? <Button variant="outline" asChild><Link href={buildCoursesQuery({ search, price: priceFilter, tag: tagFilter, sort, page: currentPage - 1 })}>← ก่อนหน้า</Link></Button> : null}{Array.from({ length: Math.min(5, pagination.totalPages) }, (_, index) => { let pageNumber; if (pagination.totalPages <= 5) pageNumber = index + 1; else if (currentPage <= 3) pageNumber = index + 1; else if (currentPage >= pagination.totalPages - 2) pageNumber = pagination.totalPages - 4 + index; else pageNumber = currentPage - 2 + index; const isActive = currentPage === pageNumber; return <Button key={pageNumber} variant={isActive ? 'default' : 'outline'} size="icon-sm" asChild><Link href={buildCoursesQuery({ search, price: priceFilter, tag: tagFilter, sort, page: pageNumber })} aria-current={isActive ? 'page' : undefined}>{pageNumber}</Link></Button>; })}{currentPage < pagination.totalPages ? <Button variant="outline" asChild><Link href={buildCoursesQuery({ search, price: priceFilter, tag: tagFilter, sort, page: currentPage + 1 })}>ถัดไป →</Link></Button> : null}</nav> : null}
              </>
            )}
          </div>
        </section>

        {bundlesList.length > 0 ? (
          <section className="border-t bg-background py-14 sm:py-20" aria-labelledby="courses-bundles-title">
            <div className="container">
              <header className="mb-8 grid gap-4 md:grid-cols-[9rem_1fr_auto] md:items-end"><p className="font-mono text-xs tracking-[.14em] text-primary uppercase">02 / Learning paths</p><div><h2 id="courses-bundles-title" className="text-3xl font-semibold tracking-[-.03em] sm:text-4xl">ถ้าอยากเรียนต่อเนื่อง ลองดูแบบชุด</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">รวมคอร์สที่ต่อเนื่องกันไว้ในเส้นทางเดียว พร้อมราคาที่เปรียบเทียบได้ชัดเจน</p></div><Badge variant="secondary">{bundlesList.length} เส้นทาง</Badge></header>
              <div className="grid gap-5 lg:grid-cols-2">{bundlesList.map((bundle) => <Link key={bundle.id} href={`/bundles/${bundle.slug}`} className="group rounded-2xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"><Card className="h-full transition-shadow group-hover:shadow-[var(--academy-shadow-card-hover)]"><CardHeader><div className="flex items-center justify-between gap-3"><Badge>Bundle · {bundle.courseCount} คอร์ส</Badge>{bundle.discount > 0 ? <Badge variant="destructive">ประหยัด {bundle.discount}%</Badge> : null}</div><CardTitle className="mt-3 text-2xl group-hover:text-primary">{bundle.title}</CardTitle>{bundle.description ? <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{bundle.description}</p> : null}</CardHeader><CardContent><div className="space-y-2 border-y py-4 text-sm">{bundle.courses.slice(0, 2).map((course, index) => <p key={`${bundle.id}-${index}`}>{String(index + 1).padStart(2, '0')} · {course.courseTitle}</p>)}{bundle.courses.length > 2 ? <p className="text-muted-foreground">+{bundle.courses.length - 2} คอร์ส</p> : null}</div><div className="mt-5 flex items-end justify-between gap-4"><div><strong className="text-2xl">฿{parseFloat(bundle.price).toLocaleString()}</strong><s className="ml-2 text-sm text-muted-foreground">฿{bundle.totalOriginalPrice.toLocaleString()}</s></div><span className="text-sm font-semibold text-primary">ดูรายละเอียด →</span></div></CardContent></Card></Link>)}</div>
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </>
  );
}

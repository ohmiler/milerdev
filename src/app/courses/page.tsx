import Link from 'next/link';
import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CourseCard from '@/components/course/CourseCard';
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
  const lessonCountSubquery = db
    .select({ courseId: lessons.courseId, lessonCount: count().as('lesson_count') })
    .from(lessons)
    .groupBy(lessons.courseId)
    .as('lc');

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
        lessonCount: sql<number>`COALESCE(${lessonCountSubquery.lessonCount}, 0)`.as('lesson_count'),
      })
      .from(courses)
      .leftJoin(users, eq(courses.instructorId, users.id))
      .leftJoin(lessonCountSubquery, eq(courses.id, lessonCountSubquery.courseId))
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

  const [coursesData, allTags, bundlesList] = await Promise.all([
    getCoursesData({ page: currentPage, limit: 12, search, priceFilter, tagSlug: tagFilter, sort }),
    getAllTags(),
    getPublishedBundles(),
  ]);

  const { courses: courseList, pagination } = coursesData;

  return (
    <><Navbar /><main className="courses-page">
      <header className="courses-hero"><div className="container courses-hero__grid"><p className="courses-hero__index">Course index / {pagination.total} หลักสูตร</p><h1>เลือกทักษะ<br />แล้วเริ่มลงมือสร้าง</h1><p className="courses-hero__lede">ค้นหาตามหัวข้อและราคา เพื่อเลือกคอร์สที่ตรงกับสิ่งที่คุณต้องการพัฒนาต่อ</p></div></header>
      {bundlesList.length > 0 && <section className="courses-bundles" aria-labelledby="courses-bundles-title"><div className="container"><div className="courses-section-head"><h2 id="courses-bundles-title">เรียนเป็นชุด</h2><p>รวมคอร์สที่ต่อเนื่องกันไว้ในเส้นทางเดียว พร้อมราคาที่เปรียบเทียบได้ชัดเจน</p></div><div className="courses-bundles__list">{bundlesList.map(bundle => <Link key={bundle.id} href={`/bundles/${bundle.slug}`} className="courses-bundle"><div className="courses-bundle__meta">Bundle · {bundle.courseCount} คอร์ส</div><div className="courses-bundle__content"><h3>{bundle.title}</h3>{bundle.description && <p>{bundle.description.slice(0,120)}{bundle.description.length > 120 ? '…' : ''}</p>}</div><div className="courses-bundle__courses">{bundle.courses.slice(0,2).map((course,index) => <span key={`${bundle.id}-${index}`}>{course.courseTitle}</span>)}{bundle.courses.length > 2 && <span>+{bundle.courses.length - 2} คอร์ส</span>}</div><div className="courses-bundle__price"><span>฿{parseFloat(bundle.price).toLocaleString()}</span><s>฿{bundle.totalOriginalPrice.toLocaleString()}</s>{bundle.discount > 0 && <small>ประหยัด {bundle.discount}%</small>}</div><span className="courses-bundle__action">ดูรายละเอียด <span aria-hidden="true">→</span></span></Link>)}</div></div></section>}
      <section className="courses-catalog" aria-labelledby="courses-catalog-title"><div className="container"><div className="courses-catalog__head"><h2 id="courses-catalog-title">คอร์สทั้งหมด</h2><p aria-live="polite">พบ {pagination.total} คอร์ส</p></div>
        <form method="GET" action="/courses" className="courses-filter"><div className="courses-filter__search"><label htmlFor="course-search">ค้นหาจากชื่อคอร์ส</label><input id="course-search" type="search" name="search" defaultValue={search} placeholder="เช่น JavaScript, React, Next.js" /></div><div className="courses-filter__field"><label htmlFor="course-price">ราคา</label><select id="course-price" name="price" defaultValue={priceFilter}><option value="all">ทุกราคา</option><option value="free">ฟรี</option><option value="paid">มีค่าใช้จ่าย</option></select></div><div className="courses-filter__field"><label htmlFor="course-tag">หัวข้อ</label><select id="course-tag" name="tag" defaultValue={tagFilter}><option value="all">ทุกหัวข้อ</option>{allTags.map(tag => <option key={tag.id} value={tag.slug}>{tag.name}</option>)}</select></div><div className="courses-filter__field"><label htmlFor="course-sort">เรียงตาม</label><select id="course-sort" name="sort" defaultValue={sort}><option value="newest">ใหม่ล่าสุด</option><option value="oldest">เก่าสุด</option><option value="price-low">ราคาต่ำไปสูง</option><option value="price-high">ราคาสูงไปต่ำ</option></select></div><div className="courses-filter__actions"><button type="submit">แสดงผลลัพธ์</button><Link href="/courses">ล้างตัวกรอง</Link></div></form>
        {courseList.length === 0 ? <div className="courses-empty"><p className="courses-empty__code">No matching courses</p><h3>ไม่พบคอร์สตามเงื่อนไขนี้</h3><p>ลองใช้คำค้นที่สั้นลง หรือเลือกหัวข้อและราคาใหม่</p><Link href="/courses">ดูคอร์สทั้งหมด</Link></div> : <><div className="courses-grid">{courseList.map(course => <CourseCard key={course.id} id={course.id} title={course.title} slug={course.slug} description={course.description} thumbnailUrl={course.thumbnailUrl} price={parseFloat(course.price || '0')} promoPrice={course.promoPrice ? parseFloat(course.promoPrice) : null} isPromoActive={course.isPromoActive} instructorName={course.instructor?.name || null} lessonCount={course.lessonCount} tags={course.tags} />)}</div>{pagination.totalPages > 1 && <nav className="courses-pagination" aria-label="หน้ารายการคอร์ส">{currentPage > 1 && <Link className="courses-pagination__direction" href={buildCoursesQuery({search,price:priceFilter,tag:tagFilter,sort,page:currentPage-1})}>← ก่อนหน้า</Link>}<div className="courses-pagination__pages">{Array.from({length:Math.min(5,pagination.totalPages)},(_,index)=>{let pageNumber;if(pagination.totalPages<=5)pageNumber=index+1;else if(currentPage<=3)pageNumber=index+1;else if(currentPage>=pagination.totalPages-2)pageNumber=pagination.totalPages-4+index;else pageNumber=currentPage-2+index;const isActive=currentPage===pageNumber;return <Link key={pageNumber} href={buildCoursesQuery({search,price:priceFilter,tag:tagFilter,sort,page:pageNumber})} className={isActive?'is-active':''} aria-current={isActive?'page':undefined}>{pageNumber}</Link>})}</div>{currentPage < pagination.totalPages && <Link className="courses-pagination__direction" href={buildCoursesQuery({search,price:priceFilter,tag:tagFilter,sort,page:currentPage+1})}>ถัดไป →</Link>}</nav>}</>}</div></section>
    </main><Footer /></>
  );
}
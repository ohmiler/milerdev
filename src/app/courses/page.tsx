import Link from 'next/link';
import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CourseCard from '@/components/course/CourseCard';
import PageHeader from '@/components/layout/PageHeader';
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
    <>
      <Navbar />
      <main style={{ paddingTop: '0' }}>
        <PageHeader
          badge="คอร์สทั้งหมด"
          title="เรียนรู้ได้ทุกที่ ทุกเวลา"
          description="เลือกคอร์สที่ใช่สำหรับคุณ และเริ่มต้นเส้นทางสู่การเป็น Developer มืออาชีพ"
          align="center"
        />

        {bundlesList.length > 0 && (
          <section style={{ padding: '40px 0 0' }}>
            <div className="container">
              <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>Bundle สุดคุ้ม</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                {bundlesList.map((bundle) => (
                  <Link key={bundle.id} href={`/bundles/${bundle.slug}`} style={{ textDecoration: 'none' }}>
                    <div style={{ background: 'linear-gradient(135deg, #1e1b4b, #7c3aed)', borderRadius: '16px', padding: '24px', color: 'white', height: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '0.8125rem', opacity: 0.8 }}>Bundle • {bundle.courseCount} คอร์ส</div>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 8px' }}>{bundle.title}</h3>
                      {bundle.description && <p style={{ fontSize: '0.875rem', opacity: 0.8, margin: '0 0 12px', lineHeight: 1.5 }}>{bundle.description.slice(0, 80)}{bundle.description.length > 80 ? '...' : ''}</p>}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                        {bundle.courses.slice(0, 3).map((course, index) => <span key={`${bundle.id}-${index}`} style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: '50px', fontSize: '0.75rem' }}>{course.courseTitle}</span>)}
                        {bundle.courses.length > 3 && <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>+{bundle.courses.length - 3} อีก</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>฿{parseFloat(bundle.price).toLocaleString()}</span>
                        <span style={{ textDecoration: 'line-through', opacity: 0.6, fontSize: '0.875rem' }}>฿{bundle.totalOriginalPrice.toLocaleString()}</span>
                        {bundle.discount > 0 && <span style={{ background: '#fbbf24', color: '#1e1b4b', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>ลด {bundle.discount}%</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="section">
          <div className="container">
            <form method="GET" action="/courses" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
                <div style={{ position: 'relative', minWidth: '200px', flex: 1, maxWidth: '300px' }}>
                  <input type="text" name="search" defaultValue={search} placeholder="ค้นหาคอร์ส..." style={{ width: '100%', padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem' }} />
                </div>
                <select name="price" defaultValue={priceFilter} style={{ padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', fontSize: '0.875rem' }}>
                  <option value="all">ทุกราคา</option>
                  <option value="free">ฟรี</option>
                  <option value="paid">มีค่าใช้จ่าย</option>
                </select>
                <select name="tag" defaultValue={tagFilter} style={{ padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', fontSize: '0.875rem' }}>
                  <option value="all">ทุกแท็ก</option>
                  {allTags.map((tag) => <option key={tag.id} value={tag.slug}>{tag.name}</option>)}
                </select>
                <select name="sort" defaultValue={sort} style={{ padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', fontSize: '0.875rem' }}>
                  <option value="newest">ใหม่ล่าสุด</option>
                  <option value="oldest">เก่าสุด</option>
                  <option value="price-low">ราคาต่ำ-สูง</option>
                  <option value="price-high">ราคาสูง-ต่ำ</option>
                </select>
                <button type="submit" style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>ค้นหา</button>
                <Link href="/courses" style={{ padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', color: '#475569', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>ล้างตัวกรอง</Link>
              </div>
              <div style={{ color: '#64748b', fontSize: '0.875rem' }}>พบ {pagination.total} คอร์ส</div>
            </form>

            {courseList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px', color: '#1e293b' }}>ไม่พบคอร์ส</h3>
                <p>ลองเปลี่ยนเงื่อนไขการค้นหา หรือกลับมาดูใหม่ภายหลัง</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                  {courseList.map((course) => (
                    <CourseCard key={course.id} id={course.id} title={course.title} slug={course.slug} description={course.description} thumbnailUrl={course.thumbnailUrl} price={parseFloat(course.price || '0')} promoPrice={course.promoPrice ? parseFloat(course.promoPrice) : null} isPromoActive={course.isPromoActive} instructorName={course.instructor?.name || null} lessonCount={course.lessonCount} tags={course.tags} />
                  ))}
                </div>

                {pagination.totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '48px', flexWrap: 'wrap' }}>
                    {currentPage > 1 && <Link href={buildCoursesQuery({ search, price: priceFilter, tag: tagFilter, sort, page: currentPage - 1 })} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', color: '#475569', textDecoration: 'none', fontWeight: 500 }}>← ก่อนหน้า</Link>}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, index) => {
                        let pageNumber;
                        if (pagination.totalPages <= 5) pageNumber = index + 1;
                        else if (currentPage <= 3) pageNumber = index + 1;
                        else if (currentPage >= pagination.totalPages - 2) pageNumber = pagination.totalPages - 4 + index;
                        else pageNumber = currentPage - 2 + index;
                        const isActive = currentPage === pageNumber;
                        return <Link key={pageNumber} href={buildCoursesQuery({ search, price: priceFilter, tag: tagFilter, sort, page: pageNumber })} style={{ width: '40px', height: '40px', border: isActive ? 'none' : '1px solid #e2e8f0', borderRadius: '8px', background: isActive ? '#2563eb' : 'white', color: isActive ? 'white' : '#64748b', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500 }}>{pageNumber}</Link>;
                      })}
                    </div>
                    {currentPage < pagination.totalPages && <Link href={buildCoursesQuery({ search, price: priceFilter, tag: tagFilter, sort, page: currentPage + 1 })} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', color: '#475569', textDecoration: 'none', fontWeight: 500 }}>ถัดไป →</Link>}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

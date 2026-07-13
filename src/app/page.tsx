export const dynamic = 'force-dynamic';

import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CourseCard from '@/components/course/CourseCard';
import ShowcaseGallery from '@/components/home/ShowcaseGallery';
import HeroCodeEditor from '@/components/home/HeroCodeEditor';
import AffiliateBannerCarousel from '@/components/home/AffiliateBannerCarousel';
import HomeAnimations from '@/components/home/HomeAnimations';
import { db } from '@/lib/db';
import { courses, lessons, users, bundles, bundleCourses } from '@/lib/db/schema';
import { eq, desc, asc, count, sql } from 'drizzle-orm';

async function getFeaturedCourses() {
  // Subquery for lesson counts
  const lessonCountSq = db
    .select({
      courseId: lessons.courseId,
      lessonCount: count().as('lesson_count'),
    })
    .from(lessons)
    .groupBy(lessons.courseId)
    .as('lc');

  // Single query with LEFT JOIN for instructor + lesson count
  const rows = await db
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
      status: courses.status,
      instructorId: courses.instructorId,
      createdAt: courses.createdAt,
      updatedAt: courses.updatedAt,
      instructorName: users.name,
      lessonCount: sql<number>`COALESCE(${lessonCountSq.lessonCount}, 0)`.as('lesson_count'),
    })
    .from(courses)
    .leftJoin(users, eq(courses.instructorId, users.id))
    .leftJoin(lessonCountSq, eq(courses.id, lessonCountSq.courseId))
    .where(eq(courses.status, 'published'))
    .orderBy(desc(courses.createdAt))
    .limit(4);

  const now = new Date();
  return rows.map((row) => {
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
      status: row.status,
      instructorId: row.instructorId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      instructor: row.instructorId ? { id: row.instructorId, name: row.instructorName } : null,
      lessonCount: Number(row.lessonCount) || 0,
    };
  });
}

async function getPublishedBundles() {
  const rows = await db
    .select({
      id: bundles.id,
      title: bundles.title,
      slug: bundles.slug,
      description: bundles.description,
      thumbnailUrl: bundles.thumbnailUrl,
      price: bundles.price,
      status: bundles.status,
      createdAt: bundles.createdAt,
      updatedAt: bundles.updatedAt,
      courseId: bundleCourses.courseId,
      courseTitle: courses.title,
      coursePrice: courses.price,
      orderIndex: bundleCourses.orderIndex,
    })
    .from(bundles)
    .leftJoin(bundleCourses, eq(bundles.id, bundleCourses.bundleId))
    .leftJoin(courses, eq(bundleCourses.courseId, courses.id))
    .where(eq(bundles.status, 'published'))
    .orderBy(desc(bundles.createdAt), asc(bundleCourses.orderIndex));

  // Group rows by bundle
  const bundleMap = new Map<string, {
    id: string; title: string; slug: string; description: string | null;
    thumbnailUrl: string | null; price: string; status: string;
    createdAt: Date | null; updatedAt: Date | null;
    courses: { courseId: string | null; courseTitle: string | null; coursePrice: string | null }[];
  }>();

  for (const row of rows) {
    if (!bundleMap.has(row.id)) {
      bundleMap.set(row.id, {
        id: row.id, title: row.title, slug: row.slug, description: row.description,
        thumbnailUrl: row.thumbnailUrl, price: row.price, status: row.status,
        createdAt: row.createdAt, updatedAt: row.updatedAt,
        courses: [],
      });
    }
    if (row.courseId) {
      bundleMap.get(row.id)!.courses.push({
        courseId: row.courseId,
        courseTitle: row.courseTitle,
        coursePrice: row.coursePrice,
      });
    }
  }

  return Array.from(bundleMap.values())
    .slice(0, 3)
    .map((bundle) => {
      const totalOriginalPrice = bundle.courses.reduce(
        (sum, c) => sum + parseFloat(c.coursePrice || '0'), 0
      );
      return {
        ...bundle,
        courseCount: bundle.courses.length,
        totalOriginalPrice,
        discount: totalOriginalPrice > 0
          ? Math.round((1 - parseFloat(bundle.price) / totalOriginalPrice) * 100)
          : 0,
      };
    });
}


// Short, outcome-focused bullets per course (matched by title keyword).
function getCourseOutcomes(title: string): string[] | null {
  const t = title.toLowerCase();
  if (t.includes('react')) return ['สร้างเว็บแอปด้วย React ได้จริง', 'ฝึกทำโปรเจกต์ Front-end', 'เหมาะกับคนมีพื้นฐาน JavaScript'];
  if (t.includes('javascript')) return ['เข้าใจ JavaScript ตั้งแต่พื้นฐาน', 'เขียนโค้ดโต้ตอบกับผู้ใช้ได้', 'ปูทางสู่ ReactJS และเฟรมเวิร์กอื่น'];
  if (t.includes('html') || t.includes('css')) return ['เขียนโครงสร้างเว็บด้วย HTML', 'จัดสไตล์ด้วย CSS อย่างมืออาชีพ', 'ทำเว็บ Responsive ทุกหน้าจอ'];
  if (t.includes('figma')) return ['แปลงดีไซน์ Figma เป็นโค้ด', 'ทำงานร่วมกับดีไซเนอร์ได้', 'สร้างหน้าเว็บตามแบบจริง'];
  return null;
}

const CLIENT_LOGOS = [
  { src: '/clients/01-clients.png', alt: 'The Programmer Association' },
  { src: '/clients/02-clients.png', alt: 'GetLinks' },
  { src: '/clients/03-clients.png', alt: 'FutureSkill' },
  { src: '/clients/04-clients.png', alt: 'E Plus' },
  { src: '/clients/05-clients.png', alt: 'มหาวิทยาลัยขอนแก่น' },
  { src: '/clients/06-clients.png', alt: 'มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ' },
  { src: '/clients/07-clients.png', alt: 'SkillLane' },
  { src: '/clients/08-clients.png', alt: 'มหาวิทยาลัยเทคโนโลยีราชมงคลรัตนโกสินทร์' },
] as const;

export default async function HomePage() {
  // Parallelize independent data fetching (async-parallel rule)
  const [featuredCourses, publishedBundles] = await Promise.all([
    getFeaturedCourses(),
    getPublishedBundles(),
  ]);

  return (
    <>
      <Navbar />

      <HomeAnimations />
      <main style={{ paddingTop: '0' }}>
        {/* Hero Section */}
        <section className="hero-section">
          <div className="container hero-container">
            <div className="hero-rail">
              <div className="hero-text">
                <div className="hero-context hero-badge-anim" aria-label="เส้นทางการเรียนจากพื้นฐานสู่โปรเจกต์">
                  <span>MILERDEV / PATH 01</span>
                  <span>LEARN → BUILD → SHIP</span>
                </div>

                <h1 className="hero-title hero-title-anim">
                  <span className="hero-title__line">เรียนโค้ดให้เข้าใจ</span>
                  <span className="hero-title__line highlight">สร้างโปรเจกต์ได้จริง</span>
                </h1>

                <p className="hero-desc-anim home-lede">
                  <span className="home-lede__line">ปูพื้นฐานอย่างเป็นขั้นตอน พร้อมลงมือทำทุกบท</span>
                  <span className="home-lede__line">เปลี่ยนความรู้ให้กลายเป็นผลงานที่ใช้งานได้จริง</span>
                </p>

                <div className="hero-actions hero-cta-anim">
                  <Link href="#featured-courses" className="btn btn-primary">
                    <svg aria-hidden="true" style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                    ดูคอร์สแนะนำ
                  </Link>
                  <Link href="/courses" className="hero-secondary-action">
                    ดูคอร์สทั้งหมด
                    <span aria-hidden="true">↗</span>
                  </Link>
                </div>

                <div className="hero-process hero-cta-anim" aria-label="ลำดับการเรียนรู้: เรียน สร้าง ส่งมอบ">
                  <span><b>01</b><strong>LEARN</strong><small>เรียนให้เข้าใจ</small></span>
                  <span><b>02</b><strong>BUILD</strong><small>ลงมือสร้าง</small></span>
                  <span><b>03</b><strong>SHIP</strong><small>ส่งมอบผลงาน</small></span>
                </div>
              </div>

              <div className="hero-ide hero-ide-anim">
                <HeroCodeEditor />
              </div>
            </div>
          </div>
        </section>
        {/* Featured Courses Section */}
        <section id="featured-courses" className="section featured-courses-section" data-reveal>
          <div className="container">
            <div className="featured-courses-head">
              <span className="featured-courses-index">COURSE INDEX / 01—{String(featuredCourses.length).padStart(2, '0')}</span>
              <div className="featured-courses-intro">
                <h2 className="section-title">
                  คอร์สยอดนิยม
                </h2>
                <p className="section-copy">เส้นทางที่นักเรียนเลือกเริ่มต้น เพื่อสร้างพื้นฐานและต่อยอดสู่โปรเจกต์จริง</p>
              </div>
              <Link href="/courses" className="featured-courses-all">
                ดูคอร์สทั้งหมด
                <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="featured-courses-grid" data-count={Math.min(featuredCourses.length, 4)}>
              {featuredCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  id={course.id}
                  title={course.title}
                  slug={course.slug}
                  description={course.description}
                  thumbnailUrl={course.thumbnailUrl}
                  price={parseFloat(course.price || '0')}
                  promoPrice={course.promoPrice ? parseFloat(course.promoPrice) : null}
                  isPromoActive={course.isPromoActive}
                  instructorName={course.instructor?.name || null}
                  lessonCount={course.lessonCount}
                  outcomes={getCourseOutcomes(course.title) || undefined}
                  variant="featured"
                />
              ))}
            </div>
          </div>
        </section>


        {/* Bundle Section */}
        {publishedBundles.length > 0 && (
          <section className="bundle-program-section" aria-labelledby="bundle-program-title">
            <div className="container bundle-program-layout">
              <div className="bundle-program-copy">
                <div className="bundle-program-kicker">
                  <svg className="bundle-program-icon__glyph" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 12 20 22 4 22 4 12"/>
                    <rect x="2" y="7" width="20" height="5"/>
                    <line x1="12" y1="22" x2="12" y2="7"/>
                    <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/>
                    <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
                  </svg>
                  <span>ชุดคอร์สประหยัด</span>
                </div>

                <h2 id="bundle-program-title" className="bundle-program-title">
                  <span className="bundle-heading-accent">ของขวัญสุดพิเศษ</span>
                </h2>
                <p className="bundle-program-description">
                  รวมคอร์สชุดพิเศษในราคาที่คุ้มค่ากว่าซื้อแยก
                </p>
                <div className="bundle-fit">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>เหมาะสำหรับคนที่อยากเริ่มจากพื้นฐานเว็บ จนต่อยอดเป็น Front-end Developer แบบครบเส้นทาง</span>
                </div>
              </div>

              {/* Bundle Cards */}
              <div className="bundle-list">
                {publishedBundles.map((bundle) => {
                  const bundlePrice = parseFloat(bundle.price);
                  return (
                    <Link key={bundle.id} href={`/bundles/${bundle.slug}`} className="bundle-program-link">
                      <div className="bundle-program-card">
                        {/* Ribbon */}
                        <div className="bundle-ribbon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 12 20 22 4 22 4 12"/>
                            <rect x="2" y="7" width="20" height="5"/>
                            <line x1="12" y1="22" x2="12" y2="7"/>
                            <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/>
                            <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
                          </svg>
                          <span>{bundle.courseCount} คอร์ส</span>
                        </div>

                        {/* Discount badge */}
                        {bundle.discount > 0 && (
                          <div className="bundle-discount-badge">
                            <span className="bundle-discount-value">-{bundle.discount}%</span>
                          </div>
                        )}

                        {/* Card content */}
                        <div className="bundle-card-content">
                          <h3 className="bundle-card-title">
                            {bundle.title}
                          </h3>

                          {bundle.description && (
                            <p className="bundle-card-description">
                              {bundle.description.slice(0, 80)}{bundle.description.length > 80 ? '...' : ''}
                            </p>
                          )}

                          {/* Course pills */}
                          <div className="bundle-course-list">
                            {bundle.courses.slice(0, 3).map((c, i) => (
                              <span key={i} className="bundle-course-pill">
                                {c.courseTitle}
                              </span>
                            ))}
                            {bundle.courses.length > 3 && (
                              <span className="bundle-more-pill">
                                +{bundle.courses.length - 3} อีก
                              </span>
                            )}
                          </div>

                          {/* Value comparison */}
                          {bundle.totalOriginalPrice > bundlePrice && (
                            <div className="bundle-value-row">
                              <span className="bundle-original-price">
                                ซื้อแยกมูลค่า{' '}
                                <span style={{ textDecoration: 'line-through' }}>฿{bundle.totalOriginalPrice.toLocaleString()}</span>
                              </span>
                              <span className="bundle-savings">
                                ประหยัด ฿{(bundle.totalOriginalPrice - bundlePrice).toLocaleString()}
                              </span>
                            </div>
                          )}

                          {/* Price row */}
                          <div className="bundle-price-row">
                            <div className="bundle-price-stack">
                              <span className="bundle-price-label">ราคา Bundle วันนี้</span>
                              <span className="bundle-price">
                                ฿{bundlePrice.toLocaleString()}
                              </span>
                            </div>
                            <span className="bundle-cta-arrow">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12"/>
                                <polyline points="12 5 19 12 12 19"/>
                              </svg>
                            </span>
                          </div>
                        </div>

                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <style>{`
              .bundle-program-section {
                padding: 56px 0;
                background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
                position: relative;
                overflow: hidden;
              }

              .bundle-program-layout {
                display: grid;
                grid-template-columns: minmax(260px, 0.72fr) minmax(0, 1.28fr);
                gap: 32px;
                align-items: center;
              }

              .bundle-program-copy {
                color: var(--gray-900);
              }

              .bundle-program-kicker {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                width: fit-content;
                padding: 8px 12px;
                border-radius: 999px;
                background: var(--primary-50);
                border: 1px solid var(--primary-200);
                color: var(--primary-700);
                font-size: 0.875rem;
                font-weight: 700;
                margin-bottom: 14px;
              }
              .bundle-program-icon__glyph {
                color: var(--primary-600);
              }

              .bundle-heading-accent {
                color: var(--gray-900);
              }

              .bundle-program-title {
                margin: 0 0 10px;
                font-size: 2rem;
                font-weight: 800;
                line-height: 1.28;
                letter-spacing: 0;
                text-wrap: balance;
              }

              .bundle-program-description {
                max-width: 44ch;
                margin: 0;
                color: var(--gray-600);
                font-size: 1.0625rem;
                line-height: var(--leading-thai);
                text-wrap: pretty;
              }

              .bundle-fit {
                margin: 18px 0 0;
                max-width: 480px;
                color: var(--gray-700);
                background: #ffffff;
                border: 1px solid var(--primary-100);
                box-shadow: none;
              }

              .bundle-fit svg {
                color: var(--primary-500);
              }

              .bundle-list {
                display: grid;
                gap: 14px;
              }

              .bundle-program-link {
                color: inherit;
                text-decoration: none;
              }

              .bundle-program-card {
                position: relative;
                border-radius: 12px;
                overflow: hidden;
                height: 100%;
                cursor: pointer;
                transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
                background: #ffffff;
                border: 1px solid var(--gray-200);
                padding: 20px;
              }
              .bundle-program-card:hover {
                transform: translateY(-2px);
                border-color: var(--primary-300);
                background: #ffffff;
              }
              .bundle-program-card:hover .bundle-cta-arrow {
                transform: translateX(4px);
                background-position: 100% 50%;
                opacity: 1;
              }
              .bundle-program-card:hover .bundle-ribbon {
                background: var(--primary-100);
              }

              /* Ribbon tag */
              .bundle-ribbon {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 6px 10px;
                margin: 0;
                background: var(--primary-50);
                border: 1px solid var(--primary-200);
                border-radius: 50px;
                color: var(--primary-700);
                font-size: 0.8125rem;
                font-weight: 700;
                transition: background 0.2s ease;
              }
              .bundle-ribbon svg { width: 14px; height: 14px; }

              /* Discount badge */
              .bundle-discount-badge {
                position: absolute;
                top: 20px;
                right: 20px;
                width: auto;
                height: auto;
                padding: 6px 10px;
                border-radius: 999px;
                background: #fff4d8;
                border: 1px solid #ffd58a;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: none;
              }
              .bundle-discount-value {
                color: #9a5a00;
                font-size: 0.8125rem;
                font-weight: 800;
              }
              .bundle-card-content {
                display: grid;
                grid-template-columns: minmax(0, 1fr) 220px;
                gap: 8px 20px;
                margin-top: 18px;
                align-items: start;
              }
              .bundle-card-title {
                margin: 0;
                color: var(--gray-900);
                font-size: 1.125rem;
                font-weight: 700;
                line-height: 1.38;
              }
              .bundle-card-description {
                margin: 0;
                color: var(--gray-600);
                font-size: 0.9375rem;
                line-height: 1.65;
                text-wrap: pretty;
              }
              .bundle-course-list {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin-top: 6px;
              }
              /* Course pills */
              .bundle-course-pill {
                background: var(--gray-50);
                border: 1px solid var(--gray-200);
                padding: 4px 12px;
                border-radius: 50px;
                font-size: 0.75rem;
                color: var(--gray-700);
                transition: background-color 0.2s ease;
              }
              .bundle-program-card:hover .bundle-course-pill {
                background: var(--primary-50);
              }
              .bundle-more-pill {
                align-self: center;
                color: var(--gray-500);
                font-size: 0.75rem;
                font-weight: 600;
              }

              .bundle-value-row {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 8px;
                margin-top: 10px;
              }
              .bundle-original-price {
                color: var(--gray-500);
                font-size: 0.8125rem;
              }
              .bundle-savings {
                background: #fff4d8;
                border: 1px solid #ffd58a;
                color: #9a5a00;
              }

              /* Price row */
              .bundle-price-row {
                grid-column: 2;
                grid-row: 1 / span 4;
                align-self: stretch;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 12px;
                padding-left: 20px;
                border-left: 1px solid var(--gray-100);
                text-align: center;
              }
              .bundle-price-stack {
                display: flex;
                flex-direction: column;
                gap: 2px;
              }
              .bundle-price-label {
                color: var(--gray-500);
                font-size: 0.75rem;
                font-weight: 700;
              }
              .bundle-price {
                color: var(--gray-900);
                font-size: 1.625rem;
                font-weight: 800;
                line-height: 1.15;
              }

              /* CTA arrow */
              .bundle-cta-arrow {
                width: 40px;
                height: 40px;
                border-radius: 10px;
                background: var(--primary-gradient);
                background-size: 150% 150%;
                background-position: 0% 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #ffffff;
                opacity: 0.9;
                box-shadow: 0 6px 12px rgba(2, 137, 214, 0.18);
                transition: background-position 0.2s ease, transform 0.2s ease, opacity 0.2s ease;
                flex-shrink: 0;
              }

              @media (max-width: 900px) {
                .bundle-program-layout {
                  grid-template-columns: 1fr;
                  gap: 24px;
                }
                .bundle-program-description,
                .bundle-fit {
                  max-width: 680px;
                }
              }

              @media (max-width: 640px) {
                .bundle-program-section {
                  padding: 44px 0;
                }
                .bundle-program-title {
                  font-size: 1.625rem;
                }
                .bundle-program-card {
                  padding: 18px;
                }
                .bundle-discount-badge {
                  position: static;
                  width: fit-content;
                  margin-top: 10px;
                  border-radius: 999px;
                }
                .bundle-card-content {
                  grid-template-columns: 1fr;
                }
                .bundle-price-row {
                  grid-column: auto;
                  grid-row: auto;
                  align-items: flex-start;
                  padding: 14px 0 0;
                  border-left: 0;
                  border-top: 1px solid var(--gray-100);
                  text-align: left;
                }
              }
            `}</style>
          </section>
        )}

        {/* Client Showcase Section */}
        <section className="client-showcase-section" aria-labelledby="client-showcase-title">
          <div className="container client-showcase-layout">
            <div className="client-showcase-head">
              <p className="client-showcase-meta">
                <span>PROOF INDEX / 01—08</span>
                <span>TH / EDUCATION + TECH</span>
              </p>
              <h2 id="client-showcase-title" className="section-title client-showcase-title">
                องค์กรและมหาวิทยาลัยที่เคยเชิญ MilerDev ไปแบ่งปันความรู้
              </h2>
              <p className="section-copy client-showcase-copy">
                ตัวอย่างองค์กรและสถาบันการศึกษาที่เชิญ MilerDev เป็นวิทยากรด้านการเขียนโปรแกรมและการพัฒนาเว็บไซต์
              </p>
            </div>

            <ul className="client-logo-grid" aria-label="องค์กรและสถาบันที่เคยร่วมงานกับ MilerDev">
              {CLIENT_LOGOS.map((logo, index) => (
                <li key={logo.src} className="client-logo-item">
                  <span className="client-logo-index" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="client-logo-media">
                    <img src={logo.src} alt="" className="client-logo-image" loading="lazy" decoding="async" />
                  </div>
                  <span className="client-logo-name">{logo.alt}</span>
                </li>
              ))}
            </ul>
          </div>

          <style>{`
            .client-showcase-section {
              padding: clamp(64px, 8vw, 104px) 0;
              background: var(--canvas);
              border-bottom: 1px solid var(--line);
            }
            .client-showcase-layout {
              display: grid;
              grid-template-columns: repeat(12, minmax(0, 1fr));
              align-items: start;
              row-gap: clamp(40px, 5vw, 64px);
            }
            .client-showcase-head {
              grid-column: 1 / -1;
              display: grid;
              grid-template-columns: repeat(12, minmax(0, 1fr));
              align-items: end;
            }
            .client-showcase-meta {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              grid-column: 1 / -1;
              margin: 0 0 32px;
              padding: 10px 0;
              border-block: 1px solid var(--line);
              color: var(--ink-muted);
              font-family: var(--font-code);
              font-size: 0.6875rem;
              font-weight: 700;
              letter-spacing: 0.06em;
            }
            .client-showcase-meta span:last-child { color: var(--accent-strong); }
            .client-showcase-title {
              grid-column: 1 / span 8;
              max-width: 24ch;
              margin: 0;
              padding-right: clamp(24px, 4vw, 64px);
              font-size: clamp(1.875rem, 3vw, 3rem);
              line-height: 1.22;
              letter-spacing: -0.025em;
              text-wrap: balance;
            }
            .client-showcase-copy {
              grid-column: 9 / -1;
              max-width: 42ch;
              margin: 0;
              color: var(--ink-soft);
              line-height: var(--leading-thai);
              text-wrap: pretty;
            }
            .client-logo-grid {
              grid-column: 1 / -1;
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              margin: 0;
              padding: 0;
              border-top: 1px solid var(--line-strong);
              border-left: 1px solid var(--line);
              list-style: none;
            }
            .client-logo-item {
              display: grid;
              grid-template-rows: auto minmax(72px, 1fr) auto;
              min-width: 0;
              min-height: 148px;
              padding: 12px;
              border-right: 1px solid var(--line);
              border-bottom: 1px solid var(--line);
              background: var(--surface);
            }
            .client-logo-index {
              color: var(--accent-strong);
              font-family: var(--font-code);
              font-size: 0.625rem;
              font-weight: 700;
              letter-spacing: 0.06em;
            }
            .client-logo-media {
              display: flex;
              align-items: center;
              justify-content: center;
              min-width: 0;
              padding: 8px 4px;
            }
            .client-logo-image {
              width: auto;
              height: auto;
              max-width: 148px;
              max-height: 60px;
              object-fit: contain;
            }
            .client-logo-name {
              min-width: 0;
              color: var(--ink-soft);
              font-size: 0.8125rem;
              font-weight: 650;
              line-height: 1.45;
              text-wrap: pretty;
            }
            @media (max-width: 1023px) {
              .client-showcase-title {
                grid-column: 1 / span 7;
                padding-right: 32px;
              }
              .client-showcase-copy {
                grid-column: 8 / -1;
              }
            }
            @media (max-width: 760px) {
              .client-showcase-head {
                grid-template-columns: 1fr;
                gap: 18px;
              }
              .client-showcase-meta,
              .client-showcase-title,
              .client-showcase-copy {
                grid-column: 1;
              }
              .client-showcase-meta {
                margin-bottom: 18px;
              }
              .client-showcase-title {
                max-width: 22ch;
                padding-right: 0;
              }
              .client-showcase-copy {
                max-width: 60ch;
              }
            }
            @media (max-width: 640px) {
              .client-showcase-section { padding: 56px 0; }
              .client-showcase-layout { gap: 32px; }
              .client-logo-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
              .client-logo-item {
                min-height: 140px;
                padding: 12px;
              }
              .client-logo-image {
                max-width: 118px;
                max-height: 52px;
              }
              .client-logo-name { font-size: 0.75rem; }
            }
          `}</style>
        </section>
        {/* Showcase Gallery */}
        <ShowcaseGallery />

        {/* Affiliate Banner Carousel */}
        <AffiliateBannerCarousel />

        {/* CTA Section */}
        <section className="cta-section home-final-cta">
          <div className="container home-final-cta__inner">
            <p className="home-final-cta__meta">
              <span>NEXT STEP / 01</span>
              <span>COURSE CATALOG / REGISTER</span>
            </p>
            <div className="home-final-cta__content">
              <h2 className="home-final-cta__title">
                เริ่มสร้างทักษะ Coding ที่ใช้ได้จริงตั้งแต่วันนี้
              </h2>
              <p className="home-final-cta__copy">
                เลือกคอร์สที่เหมาะกับคุณ แล้วลงมือสร้างผลงานชิ้นแรกของคุณ
              </p>
            </div>
            <div className="home-final-actions">
              <Link
                href="/courses"
                className="home-final-action home-final-action--primary"
              >
                ดูคอร์สทั้งหมด
                <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/register"
                className="home-final-action home-final-action--secondary"
              >
                สมัครสมาชิกฟรี
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

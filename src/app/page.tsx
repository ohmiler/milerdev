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
    .limit(6);

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

async function getCourseLookup() {
  return db
    .select({ title: courses.title, slug: courses.slug })
    .from(courses)
    .where(eq(courses.status, 'published'));
}

type CourseLookupRow = { title: string; slug: string };

// Guided beginner journey. Each step maps to a real published course by title keyword.
const LEARNING_PATH_STEPS = [
  { match: ['html', 'css'], stage: 'พื้นฐานการเขียนเว็บ', title: 'HTML & CSS', outcome: 'เขียนโครงสร้างเว็บและจัดหน้าตาให้สวย รองรับทุกหน้าจอได้' },
  { match: ['javascript'], stage: 'ตรรกะการเขียนโปรแกรม', title: 'JavaScript', outcome: 'ทำให้เว็บโต้ตอบกับผู้ใช้ และเข้าใจการเขียนโปรแกรมจริง' },
  { match: ['react'], stage: 'ต่อยอดด้วย Framework', title: 'ReactJS Front-End', outcome: 'สร้างเว็บแอปสมัยใหม่ด้วย React ได้ด้วยตัวเอง' },
  { match: ['figma'], stage: 'สู่ระดับมืออาชีพ', title: 'Figma to Code', outcome: 'แปลงดีไซน์จาก Figma ให้กลายเป็นโค้ดแบบมืออาชีพ' },
];

function buildLearningPath(lookup: CourseLookupRow[]) {
  return LEARNING_PATH_STEPS.map((step) => {
    const course = lookup.find((c) =>
      step.match.some((kw) => c.title.toLowerCase().includes(kw))
    );
    return {
      stage: step.stage,
      outcome: step.outcome,
      title: course?.title ?? step.title,
      href: course ? `/courses/${course.slug}` : '/courses',
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
  const [featuredCourses, publishedBundles, courseLookup] = await Promise.all([
    getFeaturedCourses(),
    getPublishedBundles(),
    getCourseLookup(),
  ]);

  const learningPath = buildLearningPath(courseLookup);

  return (
    <>
      <Navbar />

      <HomeAnimations />
      <main style={{ paddingTop: '0' }}>
        {/* Hero Section */}
        <section className="hero-section">
          {/* Background decorations */}
          <div className="hero-bg-decoration hero-bg-1" />
          <div className="hero-bg-decoration hero-bg-2" />
          <div className="hero-bg-decoration hero-bg-3" />

          <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: '1320px' }}>
            <div className="hero-grid" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '48px',
              alignItems: 'center',
            }}>
              {/* Left: Text Content */}
              <div className="hero-text">
                {/* Badge */}
                <div className="hero-badge-anim" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--primary-50)',
                  color: 'var(--primary-700)',
                  padding: '10px 20px',
                  borderRadius: '50px',
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '28px',
                  border: '1px solid var(--primary-200)'
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    background: 'var(--primary-500)',
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite'
                  }} />
                  คอร์สเขียนเว็บสำหรับมือใหม่ ถึงระดับทำงานได้จริง
                </div>

                {/* Title */}
                <h1 className="hero-title hero-title-anim">
                  <span className="hero-title__line">เรียน Coding ตั้งแต่พื้นฐาน</span>
                  <span className="hero-title__line highlight">จนสร้างโปรเจกต์จริงได้</span>
                </h1>

                <p className="hero-desc-anim home-lede" style={{ marginBottom: '32px' }}>
                  คอร์สเขียนโปรแกรมสำหรับผู้เริ่มต้น นักศึกษา และคนที่อยากต่อยอดรับงานหรือสร้างผลงานของตัวเอง
                  เรียนเป็นขั้นตอน ลงมือทำจริงทุกบทเรียน
                </p>

                {/* CTA Buttons */}
                <div className="hero-cta-anim" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
                  <Link href="#learning-path" className="btn btn-primary" style={{ padding: '14px 28px' }}>
                    <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                    เริ่มตามเส้นทางการเรียน
                  </Link>
                  <Link href="/courses" className="btn btn-secondary" style={{ padding: '14px 28px' }}>
                    ดูคอร์สทั้งหมด
                  </Link>
                </div>

                {/* Inline trust mini-stats */}
                <div className="hero-stats hero-cta-anim">
                  <div className="hero-stat">
                    <strong>180,000+</strong>
                    <span>ผู้ติดตาม</span>
                  </div>
                  <div className="hero-stat__divider" />
                  <div className="hero-stat">
                    <strong>1,000+</strong>
                    <span>นักเรียน</span>
                  </div>
                  <div className="hero-stat__divider" />
                  <div className="hero-stat">
                    <strong>3,500+</strong>
                    <span>วิดีโอสอนฟรี</span>
                  </div>
                </div>

              </div>

              {/* Right: IDE Animation */}
              <div className="hero-ide hero-ide-anim">
                <HeroCodeEditor />
              </div>
            </div>
          </div>
        </section>

        {/* Learning Path — guided beginner journey */}
        {learningPath.length > 0 && (
          <section id="learning-path" className="learning-path" data-reveal aria-label="เส้นทางการเรียนสำหรับมือใหม่">
            <div className="container">
              <div className="lp-head">
                <span className="lp-eyebrow">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                  </svg>
                  เริ่มจากศูนย์? แนะนำเส้นทางนี้
                </span>
                <h2>เส้นทางการเรียนสำหรับมือใหม่</h2>
                <p>เรียนตามลำดับนี้ทีละขั้น จากพื้นฐานการเขียนเว็บ จนต่อยอดเป็น Front-end Developer ได้</p>
              </div>

              <ol className="lp-track">
                {learningPath.map((step, i) => (
                  <li key={i} className="lp-step-item">
                    <Link href={step.href} className="lp-step">
                      <span className="lp-step__num">{i + 1}</span>
                      <span className="lp-step__stage">{step.stage}</span>
                      <span className="lp-step__title">{step.title}</span>
                      <span className="lp-step__outcome">{step.outcome}</span>
                      <span className="lp-step__cta">
                        เริ่มเรียนคอร์สนี้
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {/* Features Section */}
        <section id="why-milerdev" className="section" style={{ background: 'white' }} data-reveal>
          <div className="container">
            <div className="trust-section__head">
              <h2 className="section-title">
                ทำไมต้องเรียนกับเรา?
              </h2>
              <p className="section-copy">
                เราออกแบบคอร์สให้เข้าใจง่าย เน้นลงมือทำจริง และมีประสบการณ์สอนที่ได้รับความไว้วางใจจากผู้เรียนจำนวนมาก
              </p>
            </div>

            {/* Credibility stats band */}
            <div className="trust-stats" data-reveal>
              <div className="trust-stat">
                <div className="trust-stat__value">180,000+</div>
                <div className="trust-stat__label">ผู้ติดตามบนโซเชียลมีเดีย</div>
              </div>
              <div className="trust-stat">
                <div className="trust-stat__value">1,000+</div>
                <div className="trust-stat__label">นักเรียนที่ลงทะเบียนเรียน</div>
              </div>
              <div className="trust-stat">
                <div className="trust-stat__value">3,500+</div>
                <div className="trust-stat__label">วิดีโอสอนฟรีบน YouTube</div>
              </div>
              <div className="trust-stat">
                <div className="trust-stat__value trust-stat__value--word">เข้าใจง่าย</div>
                <div className="trust-stat__label">สอนเป็นขั้นตอนสำหรับมือใหม่</div>
              </div>
            </div>

            <div className="trust-reasons">
              {/* Feature 1 */}
              <div className="trust-reason" data-reveal data-delay="0">
                <div className="trust-reason__icon" aria-hidden="true">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="trust-reason__title">
                  เนื้อหาอัพเดทล่าสุด
                </h3>
                <p className="trust-reason__copy">
                  เนื้อหาถูกอัพเดทตลอดเวลาให้ทันกับเทคโนโลยีใหม่ๆ
                </p>
              </div>

              {/* Feature 2 */}
              <div className="trust-reason" data-reveal data-delay="120">
                <div className="trust-reason__icon" aria-hidden="true">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h3 className="trust-reason__title">
                  เรียนรู้จากโปรเจกต์จริง
                </h3>
                <p className="trust-reason__copy">
                  ฝึกทำโปรเจกต์จริงที่สามารถใส่ Portfolio ได้เลย
                </p>
              </div>

              {/* Feature 3 */}
              <div className="trust-reason" data-reveal data-delay="240">
                <div className="trust-reason__icon" aria-hidden="true">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="trust-reason__title">
                  Community ที่แข็งแกร่ง
                </h3>
                <p className="trust-reason__copy">
                  ร่วมกลุ่มกับนักเรียนคนอื่นๆ แลกเปลี่ยนความรู้และประสบการณ์
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Courses Section */}
        <section id="featured-courses" className="section featured-courses-section" data-reveal>
          <div className="container">
            <div className="featured-courses-head">
              <div>
                <h2 className="section-title">
                  คอร์สยอดนิยม
                </h2>
                <p className="section-copy">คอร์สที่ได้รับความนิยมสูงสุดจากนักเรียน</p>
              </div>
              <Link href="/courses" className="btn btn-secondary">
                ดูทั้งหมด
                <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="featured-courses-grid">
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

        {/* Audience Fit — เหมาะกับใคร / ไม่เหมาะกับใคร */}
        <section id="audience-fit" className="section audience-section" data-reveal>
          <div className="container">
            <div className="audience-head">
              <h2 className="section-title">
                คอร์สของเราเหมาะกับใคร?
              </h2>
              <p className="section-copy audience-note">
                เราอยากให้คุณได้ผลลัพธ์จริง จึงบอกตรง ๆ ว่าคอร์สนี้เหมาะ และยังไม่เหมาะกับใคร
              </p>
            </div>

            <div className="audience-grid">
              <div className="audience-col audience-col--yes">
                <div className="audience-col__head">
                  <span className="audience-col__icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <h3>เหมาะกับคุณ ถ้า...</h3>
                </div>
                {[
                  'เพิ่งเริ่มต้นเขียนเว็บ และอยากมีพื้นฐานที่แน่น',
                  'เป็นนักศึกษาที่อยากได้ทักษะไว้ใช้ทำงานจริง',
                  'อยากสร้าง Portfolio ด้วยโปรเจกต์ของตัวเอง',
                  'อยากต่อยอดไปรับงาน Freelance หรือสมัครงานสาย Developer',
                ].map((item, i) => (
                  <div key={i} className="audience-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {item}
                  </div>
                ))}
              </div>

              <div className="audience-col audience-col--no">
                <div className="audience-col__head">
                  <span className="audience-col__icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </span>
                  <h3>อาจยังไม่เหมาะ ถ้า...</h3>
                </div>
                {[
                  'อยากได้ทางลัดแบบไม่ต้องฝึกเขียนโค้ดเอง',
                  'ยังไม่พร้อมลงมือทำตามทีละขั้นตอน',
                  'มองหาคอร์สขั้นสูงเฉพาะทางที่ข้ามพื้นฐานไปแล้ว',
                ].map((item, i) => (
                  <div key={i} className="audience-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
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
          <div className="container client-showcase-head">
            <h2 id="client-showcase-title" className="section-title client-showcase-title">
              องค์กรและมหาวิทยาลัยที่เคยเชิญ MilerDev ไปแบ่งปันความรู้
            </h2>
            <p className="section-copy client-showcase-copy">
              องค์กรชั้นนำและสถาบันการศึกษาที่เชิญ MilerDev ไปเป็นวิทยากรอบรมและแบ่งปันความรู้ด้านการเขียนโปรแกรม
            </p>
          </div>

          <div className="marquee-wrapper" aria-label="องค์กรและสถาบันที่เคยร่วมงานกับ MilerDev">
            <div className="marquee-inner">
              {[0, 1].map((copy) => (
                <div key={copy} className="marquee-track" aria-hidden={copy === 1}>
                  {[...CLIENT_LOGOS, ...CLIENT_LOGOS].map((logo, i) => (
                    <div key={`${copy}-${logo.src}-${i}`} className="marquee-item">
                      <img
                        src={logo.src}
                        alt={copy === 0 && i < CLIENT_LOGOS.length ? logo.alt : ''}
                        className="marquee-logo"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <style>{`
            .client-showcase-section {
              padding: 72px 0 64px;
              background: #f8fafc;
              overflow: hidden;
            }
            .client-showcase-head {
              text-align: center;
              margin-bottom: 38px;
            }
            .client-showcase-title {
              max-width: 820px;
              margin: 0 auto 12px;
              text-wrap: balance;
            }
            .client-showcase-copy {
              max-width: 720px;
              margin: 0 auto;
              text-wrap: pretty;
            }
            .marquee-wrapper {
              width: 100%;
              overflow: hidden;
              mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
              -webkit-mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
            }
            .marquee-inner {
              display: flex;
              width: max-content;
              animation: marquee 92s linear infinite;
              will-change: transform;
            }
            .marquee-track {
              display: flex;
              align-items: center;
              flex-shrink: 0;
            }
            .marquee-item {
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              flex: 0 0 168px;
              height: 84px;
              padding: 0 18px;
            }
            .marquee-logo {
              max-height: 56px;
              max-width: 132px;
              width: auto;
              height: auto;
              object-fit: contain;
              filter: grayscale(16%) saturate(0.92);
              opacity: 0.84;
              transition: filter 0.2s ease, opacity 0.2s ease, transform 0.2s ease;
            }
            .marquee-logo:hover {
              filter: grayscale(0%) saturate(1);
              opacity: 1;
              transform: translateY(-1px);
            }
            @keyframes marquee {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .marquee-wrapper:hover .marquee-inner {
              animation-play-state: paused;
            }
            @media (max-width: 640px) {
              .client-showcase-section {
                padding: 56px 0 52px;
              }
              .client-showcase-head {
                margin-bottom: 30px;
              }
              .marquee-item {
                flex-basis: 142px;
                height: 74px;
                padding: 0 14px;
              }
              .marquee-logo {
                max-height: 48px;
                max-width: 116px;
              }
            }
            @media (prefers-reduced-motion: reduce) {
              .marquee-wrapper {
                overflow-x: auto;
                mask-image: none;
                -webkit-mask-image: none;
              }
              .marquee-inner {
                animation: none;
              }
              .marquee-track[aria-hidden="true"] {
                display: none;
              }
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
            <h2 className="home-final-cta__title">
              เริ่มสร้างทักษะ Coding ที่ใช้ได้จริงตั้งแต่วันนี้
            </h2>
            <p className="home-final-cta__copy">
              เลือกคอร์สที่เหมาะกับคุณ แล้วลงมือสร้างผลงานชิ้นแรกของคุณ
            </p>
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
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

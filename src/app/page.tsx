export const dynamic = 'force-dynamic';

import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CourseCard from '@/components/course/CourseCard';
import ShowcaseGallery from '@/components/home/ShowcaseGallery';
import HeroCodeEditor from '@/components/home/HeroCodeEditor';
import AffiliateBannerCarousel from '@/components/home/AffiliateBannerCarousel';
import { db } from '@/lib/db';
import { courses, lessons, users, bundles, bundleCourses } from '@/lib/db/schema';
import { eq, desc, asc, count, sql } from 'drizzle-orm';
import styles from './home.module.css';

async function getFeaturedCourses() {
  const lessonCountSq = db
    .select({
      courseId: lessons.courseId,
      lessonCount: count().as('lesson_count'),
    })
    .from(lessons)
    .groupBy(lessons.courseId)
    .as('lc');

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

    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      thumbnailUrl: row.thumbnailUrl,
      price: row.price,
      promoPrice: row.promoPrice,
      isPromoActive: hasPromo && promoStartOk && promoEndOk,
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

  const bundleMap = new Map<string, {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    thumbnailUrl: string | null;
    price: string;
    status: string;
    createdAt: Date | null;
    updatedAt: Date | null;
    courses: { courseId: string | null; courseTitle: string | null; coursePrice: string | null }[];
  }>();

  for (const row of rows) {
    if (!bundleMap.has(row.id)) {
      bundleMap.set(row.id, {
        id: row.id,
        title: row.title,
        slug: row.slug,
        description: row.description,
        thumbnailUrl: row.thumbnailUrl,
        price: row.price,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
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
        (sum, course) => sum + parseFloat(course.coursePrice || '0'),
        0,
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
  const [featuredCourses, publishedBundles] = await Promise.all([
    getFeaturedCourses(),
    getPublishedBundles(),
  ]);

  return (
    <>
      <Navbar />

      <main className={styles.page}>
        <section className={styles.hero} aria-labelledby="home-hero-title">
          <div className={[styles.shell, styles.heroLayout].join(' ')}>
            <div className={styles.heroCopy}>
              <p className={styles.heroKicker}>พื้นที่เรียนโค้ดที่เริ่มจากความเข้าใจ</p>
              <h1 id="home-hero-title" className={styles.heroTitle}>
                เรียนให้เห็นภาพ
                <span>สร้างให้เป็นงานจริง</span>
              </h1>
              <p className={styles.heroLead}>
                ค่อย ๆ วางพื้นฐานไปพร้อมกับการลงมือทำ ทุกบทเชื่อมความรู้เข้ากับโปรเจกต์
                เพื่อให้คุณรู้ว่ากำลังเรียนอะไร และจะนำไปใช้ต่ออย่างไร
              </p>

              <div className={styles.heroActions}>
                <Link href="#featured-courses" className={styles.primaryAction}>
                  เลือกจุดเริ่มต้น
                  <span aria-hidden="true">→</span>
                </Link>
                <Link href="/courses" className={styles.secondaryAction}>สำรวจทุกคอร์ส</Link>
              </div>
            </div>

            <div className={styles.heroStage}>
              <div className={styles.codeEvidence}>
                <HeroCodeEditor />
              </div>
            </div>

            <ol className={styles.learningRhythm} aria-label="จังหวะการเรียนรู้ของ MilerDev">
              <li className={styles.rhythmItem}>
                <span className={styles.rhythmMark} aria-hidden="true" />
                <span><strong>เห็นภาพรวมก่อน</strong>เข้าใจเหตุผลและโครงสร้าง ไม่เริ่มจากการจำคำสั่ง</span>
              </li>
              <li className={styles.rhythmItem}>
                <span className={styles.rhythmMark} aria-hidden="true" />
                <span><strong>ลงมือไปพร้อมบทเรียน</strong>เปลี่ยนแนวคิดให้เป็นโค้ดและโปรเจกต์ทีละขั้น</span>
              </li>
              <li className={styles.rhythmItem}>
                <span className={styles.rhythmMark} aria-hidden="true" />
                <span><strong>ต่อยอดด้วยตัวเอง</strong>กลับมาอ่าน แก้ และพัฒนางานของคุณได้อย่างมั่นใจขึ้น</span>
              </li>
            </ol>
          </div>
        </section>

        <section id="featured-courses" className={[styles.section, styles.courseSection].join(' ')} aria-labelledby="featured-courses-title">
          <div className={styles.shell}>
            <div className={styles.sectionIntro}>
              <div>
                <p className={styles.sectionLabel}>เริ่มจากบทที่เหมาะกับคุณ</p>
                <h2 id="featured-courses-title" className={styles.sectionTitle}>คอร์สล่าสุดสำหรับก้าวถัดไป</h2>
              </div>
              <div>
                <p className={styles.sectionCopy}>
                  ดูหัวข้อ จำนวนบทเรียน ผู้สอน และราคาได้จากข้อมูลที่เผยแพร่จริง
                  แล้วเลือกเส้นทางที่ใกล้กับสิ่งที่คุณอยากสร้าง
                </p>
                <Link href="/courses" className={styles.sectionLink}>ดูคอร์สทั้งหมด <span aria-hidden="true">→</span></Link>
              </div>
            </div>

            {featuredCourses.length > 0 ? (
              <div className={styles.courseGrid}>
                {featuredCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    id={course.id}
                    title={course.title}
                    slug={course.slug}
                    description={course.description}
                    thumbnailUrl={course.thumbnailUrl}
                    price={parseFloat(course.price)}
                    promoPrice={course.promoPrice ? parseFloat(course.promoPrice) : null}
                    isPromoActive={course.isPromoActive}
                    instructorName={course.instructor?.name ?? null}
                    lessonCount={course.lessonCount}
                    variant="featured"
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <h3>กำลังเตรียมคอร์สชุดถัดไป</h3>
                <p>ระหว่างนี้คุณสามารถบอกหัวข้อหรือทักษะที่อยากเรียน เพื่อช่วยให้เราวางเนื้อหาที่ตรงกับการนำไปใช้จริง</p>
                <Link href="/contact" className={styles.emptyAction}>เสนอหัวข้อที่อยากเรียน</Link>
              </div>
            )}
          </div>
        </section>

        {publishedBundles.length > 0 && (
          <section className={[styles.section, styles.bundleSection].join(' ')} aria-labelledby="bundle-title">
            <div className={[styles.shell, styles.bundleIntro].join(' ')}>
              <div className={styles.bundleIntroCopy}>
                <p className={styles.sectionLabel}>เมื่ออยากเรียนต่อเนื่อง</p>
                <h2 id="bundle-title" className={styles.sectionTitle}>รวมหลายคอร์สให้เดินเป็นเส้นทางเดียว</h2>
                <p className={styles.sectionCopy}>
                  เห็นคอร์สที่รวมอยู่ มูลค่าปกติ และราคาชุดก่อนตัดสินใจ
                  ไม่มีการเร่งเวลา—เลือกเมื่อเส้นทางนี้ตรงกับเป้าหมายของคุณ
                </p>
              </div>

              <div className={styles.bundleList}>
                {publishedBundles.map((bundle) => {
                  const bundlePrice = parseFloat(bundle.price);
                  const savings = Math.max(bundle.totalOriginalPrice - bundlePrice, 0);

                  return (
                    <Link key={bundle.id} href={'/bundles/' + bundle.slug} className={styles.bundleRow}>
                      <div className={styles.bundleStory}>
                        <h3>{bundle.title}</h3>
                        {bundle.description && <p>{bundle.description}</p>}
                        <ul className={styles.bundleCourses} aria-label={'คอร์สในชุด ' + bundle.title}>
                          {bundle.courses.map((course) => (
                            <li key={course.courseId}>{course.courseTitle}</li>
                          ))}
                        </ul>
                      </div>

                      <div className={styles.bundleValue}>
                        <div>
                          <span className={styles.bundlePrice}>฿{bundlePrice.toLocaleString()}</span>
                          {bundle.totalOriginalPrice > bundlePrice && (
                            <>
                              <span className={styles.bundleOriginal}>จากมูลค่ารวม ฿{bundle.totalOriginalPrice.toLocaleString()}</span>
                              <span className={styles.bundleSavings}>ประหยัด ฿{savings.toLocaleString()}</span>
                            </>
                          )}
                        </div>
                        <span className={styles.bundleAction}>ดูรายละเอียด <span aria-hidden="true">→</span></span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <section className={[styles.section, styles.proofSection].join(' ')} aria-labelledby="teaching-proof-title">
          <div className={styles.shell}>
            <div className={styles.proofLead}>
              <div>
                <p className={styles.sectionLabel}>ความรู้ที่ออกไปพบผู้คน</p>
                <h2 id="teaching-proof-title" className={styles.sectionTitle}>ประสบการณ์สอนที่เกิดขึ้นนอกหน้าคอร์ส</h2>
              </div>
              <p className={styles.sectionCopy}>
                ตัวอย่างองค์กรและสถาบันการศึกษาที่เคยเชิญ MilerDev ไปแบ่งปันความรู้
                ด้านการเขียนโปรแกรมและการพัฒนาเว็บไซต์
              </p>
            </div>

            <ul className={styles.clientCloud} aria-label="องค์กรและสถาบันที่เคยร่วมงานกับ MilerDev">
              {CLIENT_LOGOS.map((logo) => (
                <li key={logo.src} className={styles.clientLogo}>
                  <span className={styles.clientMedia}>
                    <Image
                      src={logo.src}
                      alt=""
                      width={160}
                      height={160}
                      sizes="(max-width: 720px) 56px, 72px"
                    />
                  </span>
                  <span className={styles.clientName}>{logo.alt}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <ShowcaseGallery />
        <AffiliateBannerCarousel />

        <section className={styles.closing} aria-labelledby="home-closing-title">
          <div className={[styles.shell, styles.closingInner].join(' ')}>
            <div>
              <h2 id="home-closing-title">เริ่มจากหนึ่งบท แล้วค่อยสร้างสิ่งที่ใหญ่ขึ้น</h2>
              <p>เลือกคอร์สที่ตรงกับสิ่งที่อยากทำ หรือสร้างบัญชีฟรีเพื่อเตรียมพื้นที่เรียนของคุณไว้ก่อน</p>
            </div>
            <div className={styles.closingActions}>
              <Link href="/courses" className={styles.primaryAction}>เลือกคอร์สแรก <span aria-hidden="true">→</span></Link>
              <Link href="/register" className={styles.secondaryAction}>สร้างบัญชีฟรี</Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

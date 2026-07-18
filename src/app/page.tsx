export const dynamic = 'force-dynamic';

import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CourseCard from '@/components/course/CourseCard';
import ShowcaseGallery from '@/components/home/ShowcaseGallery';
import HeroCodeEditor from '@/components/home/HeroCodeEditor';
import LearningWorkspacePreview from '@/components/home/LearningWorkspacePreview';
import { db } from '@/lib/db';
import { courses, lessons } from '@/lib/db/schema';
import { eq, desc, count, sql } from 'drizzle-orm';
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
      createdAt: courses.createdAt,
      updatedAt: courses.updatedAt,
      lessonCount: sql<number>`COALESCE(${lessonCountSq.lessonCount}, 0)`.as('lesson_count'),
    })
    .from(courses)
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
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lessonCount: Number(row.lessonCount) || 0,
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
  const featuredCourses = await getFeaturedCourses();

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

          </div>
        </section>

        <section className={[styles.section, styles.workspaceSection].join(' ')} aria-labelledby="learning-workspace-title">
          <div className={styles.shell}>
            <header className={styles.workspaceIntro}>
              <div>
                <p className={styles.sectionLabel}>ไม่ใช่แค่ดูวิดีโอ แล้วปล่อยให้คุณไปต่อเอง</p>
                <h2 id="learning-workspace-title" className={styles.workspaceTitle}>
                  พื้นที่เรียนที่จำว่า <span>คุณกำลังสร้างอะไร</span>
                </h2>
              </div>
              <div className={styles.workspaceStory}>
                <p>
                  ทุกบทเชื่อมวิดีโอ ลำดับเนื้อหา และความคืบหน้าไว้ในพื้นที่เดียว
                  เพื่อให้คุณหยุด ทบทวน และกลับมาลงมือทำต่อได้โดยไม่เสียจังหวะ
                </p>
                <ul aria-label="สิ่งที่มีในพื้นที่เรียน MilerDev">
                  <li><span>01</span> วิดีโอและบทเรียนตามลำดับ</li>
                  <li><span>02</span> บันทึกบทที่เรียนจบและจุดล่าสุด</li>
                  <li><span>03</span> ใบรับรองเมื่อผ่านเงื่อนไขของคอร์ส</li>
                </ul>
              </div>
            </header>

            <LearningWorkspacePreview />
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
                  ดูหัวข้อ จำนวนบทเรียน และราคาได้จากข้อมูลที่เผยแพร่จริง
                  แล้วเลือกเส้นทางที่ใกล้กับสิ่งที่คุณอยากสร้าง
                </p>
                <Link href="/courses" className={styles.sectionLink}>ดูคอร์สทั้งหมด <span aria-hidden="true">→</span></Link>
              </div>
            </div>

            {featuredCourses.length > 0 ? (
              <div className={styles.courseGrid} data-count={Math.min(featuredCourses.length, 4)}>
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
                    instructorName={null}
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

        <section className={[styles.section, styles.proofSection].join(' ')} aria-labelledby="teaching-proof-title">
          <div className={styles.shell}>
            <div className={styles.proofLead}>
              <div>
                <p className={styles.sectionLabel}>ประสบการณ์จากห้องเรียนจริง</p>
                <h2 id="teaching-proof-title" className={styles.proofTitle}>ก่อนมาเป็นบทเรียน ความรู้นี้เคยถูกนำไปใช้สอนจริง</h2>
              </div>
              <p className={styles.sectionCopy}>
                MilerDev นำประสบการณ์จากงานสอน Web Development, AI และเส้นทางอาชีพ Developer
                กลับมาจัดเป็นบทเรียนที่เห็นภาพ เข้าใจเหตุผล และลงมือทำตามได้
              </p>
            </div>

            <div className={styles.proofFeature}>
              <figure className={styles.proofImage}>
                <Image
                  src="/showcase/06-showcase-1024x768.webp"
                  alt="เบื้องหลังพื้นที่บันทึกบทเรียนออนไลน์ของ MilerDev"
                  width={1024}
                  height={768}
                  sizes="(max-width: 820px) 100vw, 56vw"
                />
                <figcaption>ONLINE CLASSROOM / เบื้องหลังการบันทึกบทเรียน</figcaption>
              </figure>

              <div className={styles.proofNote}>
                <span>FROM FIELD TO LESSON</span>
                <strong>อธิบายให้เข้าใจก่อน แล้วค่อยพาเปลี่ยนความคิดให้เป็นโค้ด</strong>
                <p>ทั้งในเวิร์กช็อป ห้องเรียน และพื้นที่ออนไลน์ หลักยังเหมือนเดิม—เรียนเพื่อกลับไปสร้างต่อได้ด้วยตัวเอง</p>
              </div>
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

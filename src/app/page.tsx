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
import { courses, courseTags, lessons, tags, users } from '@/lib/db/schema';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import styles from './home.module.css';

async function getFeaturedCourses() {
  const lessonStatsSq = db
    .select({
      courseId: lessons.courseId,
      lessonCount: sql<number>`COUNT(*)`.as('lesson_count'),
      totalDurationSeconds: sql<number>`COALESCE(SUM(${lessons.videoDuration}), 0)`.as('total_duration_seconds'),
      freePreviewCount: sql<number>`COALESCE(SUM(CASE WHEN ${lessons.isFreePreview} = 1 THEN 1 ELSE 0 END), 0)`.as('free_preview_count'),
    })
    .from(lessons)
    .groupBy(lessons.courseId)
    .as('lesson_stats');

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
      instructorName: users.name,
      lessonCount: sql<number>`COALESCE(${lessonStatsSq.lessonCount}, 0)`.as('lesson_count'),
      totalDurationSeconds: sql<number>`COALESCE(${lessonStatsSq.totalDurationSeconds}, 0)`.as('total_duration_seconds'),
      freePreviewCount: sql<number>`COALESCE(${lessonStatsSq.freePreviewCount}, 0)`.as('free_preview_count'),
    })
    .from(courses)
    .leftJoin(users, eq(courses.instructorId, users.id))
    .leftJoin(lessonStatsSq, eq(courses.id, lessonStatsSq.courseId))
    .where(eq(courses.status, 'published'))
    .orderBy(desc(courses.createdAt))
    .limit(4);

  const courseIds = rows.map((course) => course.id);
  const courseTagRows = courseIds.length > 0
    ? await db
        .select({
          courseId: courseTags.courseId,
          id: tags.id,
          name: tags.name,
          slug: tags.slug,
        })
        .from(courseTags)
        .innerJoin(tags, eq(courseTags.tagId, tags.id))
        .where(inArray(courseTags.courseId, courseIds))
    : [];

  const tagsByCourse = new Map<string, Array<{ id: string; name: string; slug: string }>>();
  for (const tag of courseTagRows) {
    const existingTags = tagsByCourse.get(tag.courseId) ?? [];
    existingTags.push({ id: tag.id, name: tag.name, slug: tag.slug });
    tagsByCourse.set(tag.courseId, existingTags);
  }

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
      totalDurationSeconds: Number(row.totalDurationSeconds) || 0,
      hasFreePreview: Number(row.freePreviewCount) > 0,
      instructorName: row.instructorName,
      tags: tagsByCourse.get(row.id) ?? [],
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
  const featuredLessonCount = featuredCourses.reduce((total, course) => total + course.lessonCount, 0);
  const featuredPreviewCount = featuredCourses.filter((course) => course.hasFreePreview).length;

  return (
    <>
      <Navbar />

      <main className={styles.page}>
        <section className={styles.hero} aria-labelledby="home-hero-title">
          <div className={[styles.shell, styles.heroLayout].join(' ')}>
            <div className={styles.heroCopy} data-hero-copy>
              <p className={styles.heroKicker}>คอร์สออนไลน์สำหรับคนที่อยากเขียนโค้ดเป็นงานจริง</p>
              <h1 id="home-hero-title" className={styles.heroTitle}>
                เลือกเส้นทางให้ชัด
                <span>แล้วลงมือสร้างจริง</span>
              </h1>
              <p className={styles.heroLead}>
                ดูหัวข้อ ราคา จำนวนบทเรียน และบททดลองก่อนสมัคร
                แล้วเรียนตามลำดับพร้อมกลับมาทำโปรเจกต์ต่อจากจุดเดิมได้ทุกเมื่อ
              </p>

              <div className={styles.heroActions}>
                <Link href="/courses" className={styles.primaryAction}>
                  ดูคอร์สทั้งหมด
                  <span aria-hidden="true">→</span>
                </Link>
                <Link href="#featured-courses" className={styles.secondaryAction}>ดูคอร์สแนะนำ</Link>
              </div>
            </div>

            <div className={styles.heroStage} data-hero-editor>
              <div className={styles.codeEvidence}>
                <HeroCodeEditor />
              </div>
            </div>

          </div>
        </section>

        <section
          className={styles.courseEvidence}
          aria-labelledby="course-evidence-title"
          data-source="featured-courses"
        >
          <div className={[styles.shell, styles.courseEvidenceInner].join(' ')}>
            <header className={styles.courseEvidenceIntro}>
              <p>BEFORE YOU ENROLL</p>
              <h2 id="course-evidence-title">ข้อมูลคอร์สที่ใช้ตัดสินใจก่อนสมัคร</h2>
            </header>

            {featuredCourses.length > 0 ? (
              <dl className={styles.courseEvidenceFacts}>
                <div>
                  <dt>คอร์สแนะนำบนหน้านี้</dt>
                  <dd>{featuredCourses.length}</dd>
                </div>
                <div>
                  <dt>บทเรียนในชุดแนะนำ</dt>
                  <dd>{featuredLessonCount}</dd>
                </div>
                <div>
                  <dt>คอร์สที่มีบททดลอง</dt>
                  <dd>{featuredPreviewCount}</dd>
                </div>
              </dl>
            ) : (
              <p className={styles.courseEvidenceFallback}>
                ดูหัวข้อ ราคา ผู้สอน และสถานะบททดลองจากหน้ารวมคอร์สก่อนเลือกจุดเริ่มต้น
              </p>
            )}

            <Link href="/courses" className={styles.courseEvidenceLink}>
              เปรียบเทียบทุกคอร์ส
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        <section id="featured-courses" className={[styles.section, styles.courseSection].join(' ')} aria-labelledby="featured-courses-title">
          <div className={styles.shell}>
            <div className={styles.sectionIntro}>
              <div>
                <p className={styles.sectionLabel}>เริ่มจากสิ่งที่คุณอยากสร้าง</p>
                <h2 id="featured-courses-title" className={styles.sectionTitle}>เลือกคอร์สแรกจากข้อมูลจริง</h2>
              </div>
              <div>
                <p className={styles.sectionCopy}>
                  เปรียบเทียบเนื้อหา เวลาเรียน ราคา ผู้สอน และบททดลอง
                  เพื่อเลือกเส้นทางที่เหมาะกับพื้นฐานและงานที่คุณอยากทำต่อ
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
                    instructorName={course.instructorName}
                    lessonCount={course.lessonCount}
                    totalDurationSeconds={course.totalDurationSeconds}
                    hasFreePreview={course.hasFreePreview}
                    tags={course.tags}
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

        <section className={[styles.section, styles.workspaceSection].join(' ')} aria-labelledby="learning-workspace-title">
          <div className={styles.shell}>
            <header className={styles.workspaceIntro}>
              <div>
                <p className={styles.sectionLabel}>หลังเลือกคอร์ส พื้นที่เรียนช่วยให้ไปต่อได้</p>
                <h2 id="learning-workspace-title" className={styles.workspaceTitle}>
                  กลับมาเรียนต่อได้ทันที <span>จากจุดที่คุณหยุดไว้</span>
                </h2>
              </div>
              <div className={styles.workspaceStory}>
                <p>
                  ระบบเก็บลำดับบทเรียนและความคืบหน้าของคุณไว้
                  จึงกลับมาดูวิดีโอ ทบทวนโค้ด และทำโปรเจกต์ต่อได้โดยไม่ต้องเริ่มใหม่
                </p>
                <ul aria-label="สิ่งที่มีในพื้นที่เรียน MilerDev">
                  <li><span>01</span> เรียนตามลำดับ พร้อมลงมือทำทีละขั้น</li>
                  <li><span>02</span> ระบบจำบทที่เรียนจบและจุดล่าสุด</li>
                  <li><span>03</span> รับใบรับรองเมื่อเรียนครบตามเงื่อนไข</li>
                </ul>
              </div>
            </header>

            <LearningWorkspacePreview />
          </div>
        </section>

        <section className={[styles.section, styles.proofSection].join(' ')} aria-labelledby="teaching-proof-title">
          <div className={styles.shell}>
            <div className={styles.proofLead}>
              <div>
                <p className={styles.sectionLabel}>จากประสบการณ์จริง สู่โครงสร้างบทเรียน</p>
                <h2 id="teaching-proof-title" className={styles.proofTitle}>เปลี่ยนสิ่งที่อธิบายในห้องเรียน ให้เป็นลำดับที่กลับมาทบทวนได้</h2>
              </div>
              <p className={styles.sectionCopy}>
                ประสบการณ์สอน Web Development, AI และเส้นทางอาชีพ Developer ช่วยให้เห็นว่าผู้เรียนติดตรงไหน
                ก่อนนำมาเรียงใหม่เป็นภาพรวม เหตุผล และขั้นลงมือทำ
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
                <strong>เห็นภาพรวม เข้าใจเหตุผล แล้วลงมือทำตามได้</strong>
                <ul className={styles.proofSteps} aria-label="ลำดับการเปลี่ยนประสบการณ์สอนเป็นบทเรียน">
                  <li><span>01</span> ภาพรวมของสิ่งที่จะสร้าง</li>
                  <li><span>02</span> เหตุผลที่โค้ดทำงาน</li>
                  <li><span>03</span> ขั้นลงมือทำที่กลับมาทบทวนได้</li>
                </ul>
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
            <div className={styles.closingCopy}>
              <h2 id="home-closing-title">เลือกคอร์สแรก แล้วเริ่มสร้างงานของคุณ</h2>
              <p>ดูเนื้อหา ราคา และบททดลองให้ครบก่อนตัดสินใจ หรือสร้างบัญชีฟรีเพื่อเตรียมพื้นที่เรียนไว้ก่อน</p>
            </div>
            <div className={styles.closingActions}>
              <Link href="/courses" className={styles.primaryAction}>ดูคอร์สและราคา <span aria-hidden="true">→</span></Link>
              <Link href="/register" className={styles.secondaryAction}>สร้างบัญชีเพื่อเริ่มเรียน</Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

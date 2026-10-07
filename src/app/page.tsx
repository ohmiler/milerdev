import MainContent from '@/components/layout/MainContent';
export const dynamic = 'force-dynamic';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Award, Check, PlayCircle, Rocket } from 'lucide-react';
import { desc, eq, inArray, sql } from 'drizzle-orm';

import { HOME_FAQ_ITEMS } from '@/app/faq/faq-data';
import CourseCard from '@/components/course/CourseCard';
import HomeAnimations from '@/components/home/HomeAnimations';
import HomeCodeEditor from '@/components/home/HomeCodeEditor';
import HomeCourseRow from '@/components/home/HomeCourseRow';
import HomeFAQ from '@/components/home/HomeFAQ';
import HomeReviews from '@/components/home/HomeReviews';
import StudioProofSection from '@/components/home/StudioProofSection';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import SectionHeader from '@/components/layout/SectionHeader';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { db } from '@/lib/db';
import { courses, courseTags, lessons, tags, users } from '@/lib/db/schema';
import { deriveCourseDecisionFacts } from '@/lib/commerce/course-decision-facts';
import { describePathStep, planHomeCourses } from '@/lib/home/course-plan';
import { getHomeReviews, hasPublishedLessonQuiz } from '@/lib/home/proof';
import { cn } from '@/lib/utils';

// The catalog is small; this cap only guards against an unexpectedly large one.
const PUBLISHED_COURSE_LIMIT = 24;

async function getPublishedCourses() {
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
    .limit(PUBLISHED_COURSE_LIMIT);

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
    const lessonCount = Number(row.lessonCount) || 0;
    const totalDurationSeconds = Number(row.totalDurationSeconds) || 0;
    const freePreviewCount = Number(row.freePreviewCount) || 0;

    return {
      ...row,
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
        instructor: row.instructorName ? { name: row.instructorName } : null,
      }, { now }),
      tags: tagsByCourse.get(row.id) ?? [],
    };
  });
}

const HERO_FACTS = [
  'บทเรียนทดลองเปิดดูได้โดยไม่ต้องสมัคร',
  'ชำระครั้งเดียว เรียนได้ตลอดชีพ',
  'ใบรับรองเมื่อเรียนครบ',
] as const;

const LEARNING_STEPS = [
  {
    image: '/images/home/learn-curriculum.webp',
    alt: 'รายการบทเรียนในหน้าเรียน แบ่งเป็นหัวข้อ พร้อมบทที่กำลังเรียนและบทที่ยังล็อกอยู่',
    imageClassName: 'object-[50%_74%]',
    title: 'เห็นบทเรียนทั้งคอร์สก่อนเริ่ม',
    description: 'รู้ว่ากำลังอยู่บทไหน เหลืออะไรต้องเรียน และกลับมาเรียนต่อจากบทล่าสุดได้',
  },
  {
    image: '/images/home/learn-notes.webp',
    alt: 'ประเด็นสำคัญและโค้ดตัวอย่างใต้วิดีโอในหน้าเรียน',
    imageClassName: 'object-left-top',
    title: 'ดูวิดีโอและอ่านเนื้อหาประกอบในหน้าเดียว',
    description: 'สรุปและโค้ดตัวอย่างอยู่ใต้วิดีโอ คัดลอกไปลองต่อได้ทันที',
  },
] as const;

const QUIZ_STEP = {
  image: '/images/home/learn-quiz.webp',
  alt: 'คำถามแบบเลือกตอบในแบบทดสอบท้ายบท',
  imageClassName: 'object-left-top',
  title: 'ทบทวนด้วยแบบทดสอบท้ายบท',
  description: 'บทที่มีแบบทดสอบ ตอบแล้วรู้ผลพร้อมคำอธิบาย ทำซ้ำได้ไม่จำกัด',
} as const;

const PATH_GRID_COLUMNS: Record<number, string> = {
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
};

export default async function HomePage() {
  const [publishedCourses, reviews, hasQuiz] = await Promise.all([
    getPublishedCourses(),
    getHomeReviews(),
    hasPublishedLessonQuiz(),
  ]);
  const coursePlan = planHomeCourses(publishedCourses);
  const learningSteps = hasQuiz ? [...LEARNING_STEPS, QUIZ_STEP] : LEARNING_STEPS;

  return (
    <>
      <Navbar />

      <MainContent className="overflow-hidden bg-background text-foreground">
        <HomeAnimations />
        <section
          data-home-section="hero"
          className="border-b bg-card"
          aria-labelledby="home-hero-title"
        >
          <div className="container grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-14 lg:py-16">
            <div className="flex max-w-2xl flex-col items-start gap-6" data-reveal>
              <p className="rounded-full bg-secondary px-3.5 py-1.5 text-sm font-medium text-secondary-foreground">
                คอร์สเขียนโปรแกรมภาษาไทย ลองเรียนก่อนซื้อได้
              </p>
              {/* Phrases never break mid-way: Thai has no spaces between words to wrap on. */}
              <h1 id="home-hero-title" className="text-display font-bold">
                <span className="inline-block">เรียนให้เข้าใจ</span>{' '}
                <span className="inline-block">สร้างได้จริง</span>{' '}
                <span className="inline-block text-link">เติบโตเป็น</span>{' '}
                <span className="inline-block text-link">Developer</span>
              </h1>
              <p className="max-w-xl text-lead text-pretty text-muted-foreground">
                คอร์สภาษาไทยที่พาคุณเห็นภาพรวม เข้าใจเหตุผล และลงมือทำทีละขั้น
                ตั้งแต่พื้นฐานจนเป็นผลงานที่นำไปต่อยอดได้จริง
              </p>

              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Button asChild size="hero" variant="hero">
                  <Link href="/courses">
                    ดูคอร์สทั้งหมด
                    <ArrowRight data-icon="inline-end" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="hero" variant="heroOutline">
                  <Link href="/courses?preview=free">
                    <PlayCircle data-icon="inline-start" aria-hidden="true" />
                    ทดลองบทเรียนฟรี
                  </Link>
                </Button>
              </div>

              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {HERO_FACTS.map((fact) => (
                  <li key={fact} className="flex items-center gap-1.5">
                    <Check className="size-4 text-link" aria-hidden="true" />
                    {fact}
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-w-0" data-reveal data-delay="90">
              <HomeCodeEditor />
            </div>
          </div>
        </section>

        <section
          data-home-section="how"
          className="py-16 sm:py-20 lg:py-24"
          aria-labelledby="home-how-title"
        >
          <div className="container">
            <div data-reveal>
              <SectionHeader
                id="home-how-title"
                eyebrow="วิธีเรียน"
                title="เรียนทีละขั้น ในหน้าเรียน แบบเดียวกันทุกคอร์ส"
                description="ภาพด้านล่างมาจากหน้าเรียนจริง ทุกคอร์สใช้หน้าเรียนเดียวกัน ทั้งรายการบท วิดีโอ เนื้อหาประกอบ และความคืบหน้า"
              />
            </div>

            <ol className={cn('mt-10 grid gap-5 md:grid-cols-2', learningSteps.length === 3 && 'lg:grid-cols-3')}>
              {learningSteps.map((step, index) => (
                <li
                  key={step.title}
                  className="flex flex-col gap-3.5 rounded-2xl border bg-card p-5"
                  data-reveal
                  data-delay={String(index * 55)}
                >
                  <div className="relative h-[232px] overflow-hidden rounded-xl border bg-card">
                    <Image
                      src={step.image}
                      alt={step.alt}
                      fill
                      sizes="(min-width: 1024px) 360px, (min-width: 768px) 50vw, 100vw"
                      className={cn('object-cover', step.imageClassName)}
                    />
                  </div>
                  <span className="self-start rounded-lg bg-secondary px-2.5 py-0.5 font-mono text-sm font-medium text-secondary-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-h3 font-semibold">{step.title}</h3>
                  <p className="leading-7 text-muted-foreground">{step.description}</p>
                </li>
              ))}
            </ol>

            <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl bg-secondary px-6 py-5" data-reveal>
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-card text-link">
                <Award className="size-5" aria-hidden="true" />
              </span>
              <p className="min-w-0 flex-1 basis-72 leading-7">
                <strong className="font-semibold">เรียนครบทุกบท รับใบรับรองอิเล็กทรอนิกส์</strong>{' '}
                <span className="text-muted-foreground">ดาวน์โหลดหรือแชร์ได้ และมีหน้าให้คนอื่นตรวจสอบว่าเป็นของจริง</span>
              </p>
            </div>
          </div>
        </section>

        <section
          id="home-courses"
          data-home-section="courses"
          className="border-y bg-card py-16 sm:py-20 lg:py-24"
          aria-labelledby="home-courses-title"
        >
          <div className="container">
            <div data-reveal>
              <SectionHeader
                id="home-courses-title"
                eyebrow={coursePlan.mode === 'path' ? 'เส้นทางแนะนำ' : 'คอร์สล่าสุดจาก MilerDev'}
                title={coursePlan.mode === 'path' ? 'ยังไม่มีพื้นฐาน เริ่มตามลำดับนี้' : 'เลือกจากเนื้อหา ราคา และบททดลองจริง'}
                description={coursePlan.mode === 'path'
                  ? 'เรียงจากพื้นฐานไปสู่งานจริง กดดูเนื้อหา ราคา และบทเรียนทดลองของแต่ละคอร์สก่อนตัดสินใจ'
                  : undefined}
                action={coursePlan.publishedCount > 0 ? (
                  <Button asChild variant="outline">
                    <Link href="/courses">
                      ดูคอร์สทั้งหมด {coursePlan.publishedCount} คอร์ส
                      <ArrowRight data-icon="inline-end" aria-hidden="true" />
                    </Link>
                  </Button>
                ) : undefined}
              />
            </div>

            {coursePlan.mode === 'path' ? (
              <>
                <ol
                  data-count={coursePlan.steps.length}
                  className={cn('mt-10 grid gap-5 sm:grid-cols-2', PATH_GRID_COLUMNS[Math.min(coursePlan.steps.length, 4)])}
                >
                  {coursePlan.steps.map((course, index) => (
                    <li key={course.id} data-reveal data-delay={String(index * 45)}>
                      <CourseCard
                        id={course.id}
                        title={course.title}
                        slug={course.slug}
                        description={course.description}
                        thumbnailUrl={course.thumbnailUrl}
                        decisionFacts={course.decisionFacts}
                        tags={course.tags}
                        eyebrow={describePathStep(index, index > 0 ? coursePlan.steps[index - 1].title : null)}
                      />
                    </li>
                  ))}
                </ol>

                {coursePlan.extras.length > 0 ? (
                  <div className="mt-10" data-reveal>
                    <h3 className="text-h3 font-semibold">คอร์สเสริม เรียนเมื่อพร้อม</h3>
                    <ul className="mt-4 grid gap-4 md:grid-cols-2">
                      {coursePlan.extras.map((course) => (
                        <li key={course.id}>
                          <HomeCourseRow
                            title={course.title}
                            slug={course.slug}
                            thumbnailUrl={course.thumbnailUrl}
                            decisionFacts={course.decisionFacts}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : coursePlan.courses.length > 0 ? (
              <ul
                data-count={coursePlan.courses.length}
                className={cn('mt-10 grid gap-5 sm:grid-cols-2', PATH_GRID_COLUMNS[Math.max(2, coursePlan.courses.length)])}
              >
                {coursePlan.courses.map((course, index) => (
                  <li key={course.id} data-reveal data-delay={String(index * 45)}>
                    <CourseCard
                      id={course.id}
                      title={course.title}
                      slug={course.slug}
                      description={course.description}
                      thumbnailUrl={course.thumbnailUrl}
                      decisionFacts={course.decisionFacts}
                      tags={course.tags}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <Empty className="mt-10 border">
                <EmptyHeader>
                  <EmptyTitle>กำลังเตรียมคอร์สชุดถัดไป</EmptyTitle>
                  <EmptyDescription>
                    บอกหัวข้อที่คุณอยากเรียนได้ เรายินดีนำไปวางแผนเป็นเนื้อหาที่ใช้ได้จริง
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button asChild variant="outline">
                    <Link href="/contact">เสนอหัวข้อที่อยากเรียน</Link>
                  </Button>
                </EmptyContent>
              </Empty>
            )}
          </div>
        </section>

        <StudioProofSection />

        {reviews.length > 0 ? <HomeReviews reviews={reviews} /> : null}

        <section
          data-home-section="faq"
          className="bg-card py-16 sm:py-20 lg:py-24"
          aria-labelledby="home-faq-title"
        >
          <div className="container grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start lg:gap-16">
            <div className="max-w-lg lg:sticky lg:top-28" data-reveal>
              <SectionHeader
                id="home-faq-title"
                eyebrow="คำถามก่อนเริ่มเรียน"
                title="ข้อมูลที่ควรรู้ก่อนเลือกคอร์ส"
                description="ตรวจพื้นฐาน ระยะเวลาการเข้าถึง Certificate และขั้นตอนชำระเงินให้ครบก่อนตัดสินใจ"
              />
              <Button asChild variant="link" className="mt-5 px-0">
                <Link href="/faq">
                  ดูคำถามทั้งหมด
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
            </div>
            <div data-reveal data-delay="80"><HomeFAQ items={HOME_FAQ_ITEMS} /></div>
          </div>
        </section>

        <section data-home-section="final-cta" className="bg-background py-16 sm:py-20 lg:py-24" aria-labelledby="home-final-cta-title">
          <div className="container">
            <div className="grid gap-8 rounded-2xl bg-navy px-6 py-10 text-background sm:px-10 sm:py-12 lg:grid-cols-[1fr_auto] lg:items-center lg:px-14 lg:py-14" data-reveal>
              <SectionHeader
                id="home-final-cta-title"
                tone="inverse"
                eyebrow={<><Rocket className="size-4" aria-hidden="true" />พร้อมเริ่มเส้นทางของคุณแล้วหรือยัง</>}
                title="เลือกคอร์สแรก แล้วเริ่มสร้างงานของคุณ"
                description="ดูเนื้อหา ราคา และบททดลองให้ครบก่อนตัดสินใจ หรือสร้างบัญชีฟรีเพื่อเตรียมพื้นที่เรียนไว้ก่อน"
              />
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Button asChild size="lg">
                  <Link href="/courses">
                    ดูคอร์สทั้งหมด
                    <ArrowRight data-icon="inline-end" aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                >
                  <Link href="/register">สมัครสมาชิกฟรี</Link>
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

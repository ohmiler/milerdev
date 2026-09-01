export const dynamic = 'force-dynamic';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Award,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Code2,
  Languages,
  Lightbulb,
  PlayCircle,
  Rocket,
} from 'lucide-react';
import { desc, eq, inArray, sql } from 'drizzle-orm';

import { HOME_FAQ_ITEMS } from '@/app/faq/faq-data';
import TrackedAnalyticsLink from '@/components/analytics/TrackedAnalyticsLink';
import CourseCard from '@/components/course/CourseCard';
import HomeFAQ from '@/components/home/HomeFAQ';
import HomeAnimations from '@/components/home/HomeAnimations';
import StudioProofSection from '@/components/home/StudioProofSection';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { Progress } from '@/components/ui/progress';
import { db } from '@/lib/db';
import { courses, courseTags, lessons, tags, users } from '@/lib/db/schema';
import { deriveCourseDecisionFacts } from '@/lib/course-decision-facts';

async function getLatestCourses() {
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

const CONFIDENCE_POINTS = [
  {
    icon: Languages,
    title: 'อธิบายเป็นภาษาไทย',
    description: 'เห็นภาพรวมและเหตุผลก่อนลงมือเขียน',
  },
  {
    icon: CheckCircle2,
    title: 'บันทึกความคืบหน้า',
    description: 'กลับมาเรียนต่อจากจุดล่าสุดได้',
  },
  {
    icon: Clock3,
    title: 'เรียนซ้ำได้ตลอดชีพ',
    description: 'ทบทวนตามจังหวะของคุณได้ทุกเวลา',
  },
  {
    icon: Award,
    title: 'Certificate เมื่อเรียนจบ',
    description: 'รับใบรับรองเมื่อผ่านเกณฑ์ของคอร์ส',
  },
] as const;

const LEARNING_OUTCOMES = [
  {
    icon: Lightbulb,
    title: 'เข้าใจเหตุผล',
    description: 'เริ่มจากปัญหาและเป้าหมายของงาน เพื่อให้รู้ว่าเครื่องมือแต่ละชิ้นมีไว้ทำอะไร',
  },
  {
    icon: Code2,
    title: 'สร้างด้วยตัวเอง',
    description: 'เรียนแนวคิดผ่านโค้ด ตัวอย่าง และการลงมือทำ โดยไม่หยุดอยู่ที่การจำ syntax',
  },
  {
    icon: Rocket,
    title: 'ต่อยอดเป็นผลงาน',
    description: 'เชื่อมบทเรียนเป็นโปรเจกต์ที่อธิบายได้ ทดสอบได้ และนำไปพัฒนาต่อได้',
  },
] as const;

export default async function HomePage() {
  const latestCourses = await getLatestCourses();

  return (
    <>
      <Navbar />

      <main className="overflow-hidden bg-background text-foreground">
        <HomeAnimations />
        <section
          data-home-section="hero"
          className="relative isolate border-b bg-[radial-gradient(circle_at_78%_12%,rgba(0,171,255,0.16),transparent_28%),linear-gradient(180deg,var(--background)_0%,var(--muted)_100%)]"
          aria-labelledby="home-hero-title"
        >
          <div
            className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(15,35,58,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(15,35,58,0.025)_1px,transparent_1px)] bg-[size:42px_42px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
            aria-hidden="true"
          />
          <div className="container grid items-center gap-12 py-14 sm:py-16 lg:min-h-[clamp(42rem,86svh,48rem)] lg:grid-cols-[0.92fr_1.08fr] lg:gap-16 lg:py-20">
            <div className="max-w-2xl" data-reveal>
              <h1
                id="home-hero-title"
                className="max-w-[13ch] text-balance text-[clamp(2.7rem,6vw,5.25rem)] font-bold leading-[1.04] tracking-[-0.055em]"
              >
                เรียนให้เข้าใจ สร้างได้จริง{' '}
                <span className="text-secondary-foreground">เติบโตเป็น Developer</span>
              </h1>
              <p className="mt-6 max-w-xl text-pretty text-base leading-8 text-muted-foreground sm:text-lg">
                คอร์สภาษาไทยที่พาคุณเห็นภาพรวม เข้าใจเหตุผล และลงมือทำทีละขั้น
                ตั้งแต่พื้นฐานจนเป็นผลงานที่นำไปต่อยอดได้จริง
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="hero" variant="hero">
                  <TrackedAnalyticsLink
                    href="/courses"
                    analyticsEvent={{ eventName: 'home_primary_cta_clicked', placement: 'hero' }}
                  >
                    ดูคอร์สทั้งหมด
                    <ArrowRight data-icon="inline-end" aria-hidden="true" />
                  </TrackedAnalyticsLink>
                </Button>
                <Button asChild size="hero" variant="heroOutline">
                  <Link href="/courses?preview=free">
                    <PlayCircle data-icon="inline-start" aria-hidden="true" />
                    ทดลองบทเรียนฟรี
                  </Link>
                </Button>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[42rem] lg:mx-0" data-reveal data-delay="90">
              <div className="absolute -left-8 top-12 size-24 rounded-full bg-primary/20 blur-2xl" aria-hidden="true" />
              <div className="absolute -right-8 bottom-10 size-32 rounded-full bg-primary/15 blur-3xl" aria-hidden="true" />
              <Card variant="homeMedia" className="relative">
                <CardContent>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[1.45rem] bg-muted">
                    <Image
                      src="/images/milerdev-learner-hero-v1.png"
                      alt="ผู้เรียนกำลังลงมือพัฒนาโปรเจกต์ด้วยแล็ปท็อป"
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 54vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950/70 to-transparent" />
                    <div className="absolute right-5 bottom-5 left-5 flex items-end justify-between gap-4 text-white">
                      <div>
                        <p className="max-w-sm text-lg font-semibold">
                          เรียนจากโจทย์จริง แล้วลงมือสร้างไปพร้อมกัน
                        </p>
                      </div>
                      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-[#00abff] shadow-lg">
                        <PlayCircle className="size-6" aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card variant="homeProgress" className="absolute -left-3 top-7 hidden w-40 gap-3 sm:flex lg:-left-8">
                <CardHeader className="grid-cols-[1fr_auto] gap-3">
                  <CardDescription>ความคืบหน้า</CardDescription>
                  <CheckCircle2 className="text-success" aria-hidden="true" />
                  <CardTitle>75%</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={75} aria-label="ความคืบหน้า 75 เปอร์เซ็นต์" />
                </CardContent>
              </Card>

              <Card variant="homeNext" className="absolute -right-2 -bottom-5 hidden w-56 gap-2 sm:flex lg:-right-6">
                <CardHeader className="grid-cols-[auto_1fr] items-center gap-x-2">
                  <span className="row-span-2 grid size-9 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                    <BookOpenCheck aria-hidden="true" />
                  </span>
                  <CardDescription>บทเรียนถัดไป</CardDescription>
                  <CardTitle>สร้าง Feature แรก</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        <section
          data-home-section="confidence"
          className="border-b bg-background"
          aria-label="สิ่งที่ผู้เรียนได้รับจาก MilerDev"
        >
          <div className="container grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8 lg:py-9">
            {CONFIDENCE_POINTS.map(({ icon: Icon, title, description }, index) => (
              <div key={title} className="flex items-start gap-3" data-reveal data-delay={String(index * 45)}>
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold">{title}</h2>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          data-home-section="outcomes"
          className="bg-muted/30 py-16 sm:py-20 lg:py-24"
          aria-labelledby="outcomes-title"
        >
          <div className="container">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-16" data-reveal>
              <div>
                <h2
                  id="outcomes-title"
                  className="max-w-xl text-balance text-3xl font-bold tracking-[-0.035em] sm:text-4xl lg:text-5xl"
                >
                  เข้าใจให้ชัด ก่อนสร้างและต่อยอดด้วยตัวเอง
                </h2>
              </div>
              <div>
                <p className="max-w-2xl text-pretty leading-8 text-muted-foreground">
                  MilerDev ไม่ได้พาคุณทำตามวิดีโอให้จบเท่านั้น
                  แต่จัดลำดับเนื้อหาให้เห็นความสัมพันธ์ระหว่างแนวคิด โค้ด และผลลัพธ์จริง
                </p>
                <Button asChild variant="link" className="mt-5 px-0">
                  <Link href="/about">
                    ดูวิธีเรียนแบบ MilerDev
                    <ArrowRight data-icon="inline-end" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3 lg:mt-12">
              {LEARNING_OUTCOMES.map(({ icon: Icon, title, description }, index) => (
                <Card
                  key={title}
                  data-reveal data-delay={String(index * 55)}
                >
                  <CardHeader>
                    <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <CardTitle className="mt-4 text-xl">{title}</CardTitle>
                    <CardDescription className="leading-7">{description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section
          id="latest-courses"
          data-home-section="courses"
          className="bg-background py-16 sm:py-20 lg:py-24"
          aria-labelledby="latest-courses-title"
        >
          <div className="container">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end" data-reveal>
              <div>
                <p className="text-sm font-semibold text-secondary-foreground">คอร์สล่าสุดจาก MilerDev</p>
                <h2
                  id="latest-courses-title"
                  className="mt-2 text-balance text-3xl font-bold tracking-[-0.035em] sm:text-4xl"
                >
                  เลือกจากเนื้อหา ราคา และบททดลองจริง
                </h2>
              </div>
              <Button asChild variant="outline" className="w-fit">
                <Link href="/courses">
                  ดูคอร์สทั้งหมด
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
            </div>

            {latestCourses.length > 0 ? (
              <div
                data-count={latestCourses.length}
                data-home-course-track
                role="region"
                aria-label="รายการคอร์สล่าสุด"
                tabIndex={0}
                className="-mx-4 mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-5 outline-none focus-visible:ring-4 focus-visible:ring-ring/30 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4"
              >
                {latestCourses.map((course, index) => (
                  <div
                    key={course.id}
                    data-reveal
                    data-delay={String(index * 45)}
                    className="w-[82vw] max-w-[21rem] shrink-0 snap-start sm:w-auto sm:max-w-none"
                  >
                    <CourseCard
                      id={course.id}
                      title={course.title}
                      slug={course.slug}
                      description={course.description}
                      thumbnailUrl={course.thumbnailUrl}
                      decisionFacts={course.decisionFacts}
                      tags={course.tags}
                    />
                  </div>
                ))}
              </div>
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

        <section
          data-home-section="faq"
          className="bg-muted/30 py-16 sm:py-20 lg:py-24"
          aria-labelledby="home-faq-title"
        >
          <div className="container grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start lg:gap-16">
            <div className="max-w-lg lg:sticky lg:top-28" data-reveal>
              <p className="text-sm font-semibold text-secondary-foreground">คำถามก่อนเริ่มเรียน</p>
              <h2
                id="home-faq-title"
                className="mt-3 text-balance text-3xl font-bold tracking-[-0.035em] sm:text-4xl"
              >
                ข้อมูลที่ควรรู้ก่อนเลือกคอร์ส
              </h2>
              <p className="mt-4 leading-8 text-muted-foreground">
                ตรวจพื้นฐาน ระยะเวลาการเข้าถึง Certificate และขั้นตอนชำระเงินให้ครบก่อนตัดสินใจ
              </p>
              <Button asChild variant="link" className="mt-6 px-0">
                <Link href="/faq">
                  ดูคำถามทั้งหมด
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
            </div>
            <div data-reveal data-delay="80"><HomeFAQ items={HOME_FAQ_ITEMS} /></div>
          </div>
        </section>

        <section data-home-section="final-cta" className="bg-background py-16 sm:py-20 lg:py-24">
          <div className="container">
            <div className="grid gap-8 rounded-2xl bg-foreground px-6 py-10 text-background sm:px-10 sm:py-12 lg:grid-cols-[1fr_auto] lg:items-center lg:px-14 lg:py-14" data-reveal>
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-background/75">
                  <Rocket className="size-4" aria-hidden="true" />
                  พร้อมเริ่มเส้นทางของคุณแล้วหรือยัง
                </div>
                <h2 className="mt-3 max-w-2xl text-balance text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
                  เลือกคอร์สแรก แล้วเริ่มสร้างงานของคุณ
                </h2>
                <p className="mt-3 max-w-2xl leading-7 text-background/75">
                  ดูเนื้อหา ราคา และบททดลองให้ครบก่อนตัดสินใจ
                  หรือสร้างบัญชีฟรีเพื่อเตรียมพื้นที่เรียนไว้ก่อน
                </p>
              </div>
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
      </main>

      <Footer />
    </>
  );
}

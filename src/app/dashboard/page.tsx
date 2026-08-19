import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { db } from '@/lib/db';
import { enrollments, courses, lessons, lessonProgress, certificates, payments } from '@/lib/db/schema';
import { selectContinuationLesson, sortCoursesByLearningActivity } from '@/lib/learning-continuation';
import { eq, desc, count, and, inArray, isNull } from 'drizzle-orm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export const metadata: Metadata = {
    title: 'แดชบอร์ด',
    description: 'ติดตามความก้าวหน้าและจัดการคอร์สเรียนของคุณ',
};

export const dynamic = 'force-dynamic';

async function getUserEnrollments(userId: string) {
  // Optimized query: Get enrollments with courses in a single query
  const userEnrollments = await db
    .select({
      enrollment: enrollments,
      course: courses,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(eq(enrollments.userId, userId))
    .orderBy(desc(enrollments.enrolledAt));

  if (userEnrollments.length === 0) return [];

  // Get all course IDs
  const courseIds = userEnrollments.map(e => e.course.id);

  // Read the ordered curriculum and this learner's matching progress without N+1 queries.
  const [courseLessons, courseProgress] = await Promise.all([
    db
      .select({
        id: lessons.id,
        courseId: lessons.courseId,
        orderIndex: lessons.orderIndex,
      })
      .from(lessons)
      .where(inArray(lessons.courseId, courseIds)),
    db
      .select({
        courseId: lessons.courseId,
        lessonId: lessonProgress.lessonId,
        completed: lessonProgress.completed,
        watchTimeSeconds: lessonProgress.watchTimeSeconds,
        lastWatchedAt: lessonProgress.lastWatchedAt,
      })
      .from(lessonProgress)
      .innerJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
      .where(
        and(
          eq(lessonProgress.userId, userId),
          inArray(lessons.courseId, courseIds),
        )
      ),
  ]);

  const lessonsByCourse = new Map<string, typeof courseLessons>();
  const progressByCourse = new Map<string, typeof courseProgress>();

  for (const lesson of courseLessons) {
    const list = lessonsByCourse.get(lesson.courseId) ?? [];
    list.push(lesson);
    lessonsByCourse.set(lesson.courseId, list);
  }

  for (const progress of courseProgress) {
    const list = progressByCourse.get(progress.courseId) ?? [];
    list.push(progress);
    progressByCourse.set(progress.courseId, list);
  }

  const enrichedEnrollments = userEnrollments.map(({ enrollment, course }) => {
    const orderedLessons = lessonsByCourse.get(course.id) ?? [];
    const progress = progressByCourse.get(course.id) ?? [];
    const totalLessons = orderedLessons.length;
    const completedLessons = progress.filter(item => item.completed).length;
    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const continuationLesson = selectContinuationLesson(orderedLessons, progress);

    return {
      ...enrollment,
      course: {
        ...course,
        lessonCount: totalLessons,
      },
      completedLessons,
      progressPercent,
      continuationLessonId: continuationLesson?.id ?? null,
      progress,
    };
  });

  return sortCoursesByLearningActivity(enrichedEnrollments);
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const [userEnrollments, [certCount], [paymentCount]] = await Promise.all([
    getUserEnrollments(session.user.id),
    db.select({ count: count() }).from(certificates)
      .where(and(eq(certificates.userId, session.user.id), isNull(certificates.revokedAt))),
    db.select({ count: count() }).from(payments)
      .where(eq(payments.userId, session.user.id)),
  ]);
  const certificateCount = certCount?.count || 0;
  const totalPayments = paymentCount?.count || 0;
  const completedCourses = userEnrollments.filter((enrollment) => enrollment.completedAt).length;
  const activeCourses = userEnrollments.filter((enrollment) => !enrollment.completedAt).length;
  const primaryEnrollment = userEnrollments.find((enrollment) => !enrollment.completedAt) ?? userEnrollments[0] ?? null;
  const remainingEnrollments = primaryEnrollment
    ? userEnrollments.filter((enrollment) => enrollment.id !== primaryEnrollment.id)
    : [];

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-muted/20 py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-6 border-b pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">สวัสดี, {session.user.name || 'นักเรียน'}</h1>
              <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">กลับมาเรียนต่อจากคอร์สล่าสุด หรือตรวจสอบความคืบหน้าทั้งหมดของคุณ</p>
            </div>
            <nav className="flex flex-wrap gap-2" aria-label="เมนูบัญชีผู้เรียน">
              <Button asChild variant="outline"><Link href="/dashboard/certificates">ใบรับรอง <Badge variant="secondary">{certificateCount}</Badge></Link></Button>
              <Button asChild variant="outline"><Link href="/dashboard/payments">การชำระเงิน <Badge variant="secondary">{totalPayments}</Badge></Link></Button>
              <Button asChild variant="outline"><Link href="/settings">ตั้งค่าบัญชี</Link></Button>
            </nav>
          </header>

          <section className="my-8 grid grid-cols-2 gap-3 lg:grid-cols-4 [&_div]:rounded-xl [&_div]:border [&_div]:bg-card [&_div]:p-5 [&_span]:block [&_span]:text-sm [&_span]:text-muted-foreground [&_strong]:mt-2 [&_strong]:block [&_strong]:text-3xl" aria-label="สรุปการเรียน">
            <div><span>คอร์สทั้งหมด</span><strong>{userEnrollments.length}</strong></div><div><span>กำลังเรียน</span><strong>{activeCourses}</strong></div><div><span>เรียนจบแล้ว</span><strong>{completedCourses}</strong></div><div><span>ใบรับรอง</span><strong>{certificateCount}</strong></div>
          </section>

          {primaryEnrollment ? (
            <>
              <section className="mt-10" aria-labelledby="dashboard-continue-title">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div><p>Next action</p><h2 id="dashboard-continue-title">{primaryEnrollment.completedAt ? 'ทบทวนคอร์สล่าสุด' : 'เรียนต่อจากคอร์สล่าสุด'}</h2></div>
                  <span>{primaryEnrollment.completedLessons} / {primaryEnrollment.course.lessonCount} บทเรียน</span>
                </div>
                <Card className="overflow-hidden"><Link href={primaryEnrollment.continuationLessonId ? `/courses/${primaryEnrollment.course.slug}/learn/${primaryEnrollment.continuationLessonId}` : `/courses/${primaryEnrollment.course.slug}/learn`} className="grid lg:grid-cols-2">
                  <div className="relative min-h-64 bg-slate-950">
                    {primaryEnrollment.course.thumbnailUrl ? <Image className="object-cover" src={primaryEnrollment.course.thumbnailUrl.startsWith('http') ? primaryEnrollment.course.thumbnailUrl : `https://${primaryEnrollment.course.thumbnailUrl}`} alt={primaryEnrollment.course.title} fill priority sizes="(max-width: 900px) 100vw, 48vw" /> : <div className="flex h-full min-h-64 flex-col items-center justify-center text-white"><span className="text-4xl font-bold">MD</span><small>Learning</small></div>}
                  </div>
                  <CardContent className="flex flex-col justify-center p-7">
                    <Badge className="w-fit">{primaryEnrollment.progressPercent === 100 ? 'เรียนจบแล้ว' : 'กำลังเรียน'} · {primaryEnrollment.progressPercent}%</Badge>
                    <h3 className="mt-4 text-2xl font-semibold tracking-tight">{primaryEnrollment.course.title}</h3>
                    <Progress className="mt-6" value={primaryEnrollment.progressPercent} aria-label={`ความคืบหน้า ${primaryEnrollment.progressPercent}%`} />
                    <div className="mt-6 flex items-center justify-between font-semibold text-primary"><span>{primaryEnrollment.completedAt ? 'เปิดคอร์สอีกครั้ง' : 'ไปยังบทเรียนถัดไป'}</span><span aria-hidden="true">→</span></div>
                  </CardContent>
                </Link></Card>
              </section>

              <section className="mt-12" aria-labelledby="dashboard-courses-title">
                <div className="mb-5 flex items-end justify-between gap-3"><h2 className="text-2xl font-bold" id="dashboard-courses-title">คอร์สของฉัน</h2><Button asChild variant="outline"><Link href="/courses">ดูคอร์สเพิ่มเติม</Link></Button></div>
                {remainingEnrollments.length > 0 ? <div className="grid gap-3">{remainingEnrollments.map((enrollment, index) => (
                  <Link key={enrollment.id} href={enrollment.continuationLessonId ? `/courses/${enrollment.course.slug}/learn/${enrollment.continuationLessonId}` : `/courses/${enrollment.course.slug}/learn`} className="grid gap-3 rounded-xl border bg-card p-5 transition hover:border-primary/40 sm:grid-cols-[2.5rem_minmax(0,1fr)_12rem_auto] sm:items-center">
                    <span className="text-xs font-semibold text-muted-foreground">{String(index + 2).padStart(2, '0')}</span>
                    <div><strong className="block">{enrollment.course.title}</strong><span className="text-sm text-muted-foreground">{enrollment.completedLessons} / {enrollment.course.lessonCount} บทเรียน</span></div>
                    <Progress value={enrollment.progressPercent} aria-label={`ความคืบหน้า ${enrollment.progressPercent}%`} />
                    <Badge variant={enrollment.progressPercent === 100 ? 'default' : 'secondary'}>{enrollment.progressPercent === 100 ? 'เรียนจบแล้ว' : `${enrollment.progressPercent}%`}</Badge>
                  </Link>
                ))}</div> : <p className="rounded-xl border border-dashed p-6 text-muted-foreground">คอร์สที่ลงทะเบียนทั้งหมดแสดงอยู่ด้านบนแล้ว</p>}
              </section>
            </>
          ) : (
            <Card className="py-10 text-center" aria-labelledby="dashboard-empty-title"><CardContent className="mx-auto max-w-xl"><h2 className="text-2xl font-bold" id="dashboard-empty-title">เริ่มจากคอร์สที่ตรงกับสิ่งที่คุณอยากสร้าง</h2><p className="mt-3 text-muted-foreground">ดูผลลัพธ์ เนื้อหา และระดับราคาของแต่ละคอร์สก่อนเลือกเส้นทางแรก</p><Button asChild className="mt-6"><Link href="/courses">ดูคอร์สทั้งหมด <span aria-hidden="true">→</span></Link></Button></CardContent></Card>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

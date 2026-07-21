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
      <main className="learner-dashboard">
        <div className="container">
          <header className="learner-dashboard__header">
            <div>
              <p className="learner-dashboard__meta">Learning dashboard</p>
              <h1>สวัสดี, {session.user.name || 'นักเรียน'}</h1>
              <p>กลับมาเรียนต่อจากคอร์สล่าสุด หรือตรวจสอบความคืบหน้าทั้งหมดของคุณ</p>
            </div>
            <nav className="learner-dashboard__nav" aria-label="เมนูบัญชีผู้เรียน">
              <Link href="/dashboard/certificates">ใบรับรอง <span>{certificateCount}</span></Link>
              <Link href="/dashboard/payments">การชำระเงิน <span>{totalPayments}</span></Link>
              <Link href="/settings">ตั้งค่าบัญชี</Link>
            </nav>
          </header>

          <section className="learner-dashboard__stats" aria-label="สรุปการเรียน">
            <div><span>คอร์สทั้งหมด</span><strong>{userEnrollments.length}</strong></div>
            <div><span>กำลังเรียน</span><strong>{activeCourses}</strong></div>
            <div><span>เรียนจบแล้ว</span><strong>{completedCourses}</strong></div>
            <div><span>ใบรับรอง</span><strong>{certificateCount}</strong></div>
          </section>

          {primaryEnrollment ? (
            <>
              <section className="dashboard-continue" aria-labelledby="dashboard-continue-title">
                <div className="dashboard-section-head">
                  <div><p>Next action</p><h2 id="dashboard-continue-title">{primaryEnrollment.completedAt ? 'ทบทวนคอร์สล่าสุด' : 'เรียนต่อจากคอร์สล่าสุด'}</h2></div>
                  <span>{primaryEnrollment.completedLessons} / {primaryEnrollment.course.lessonCount} บทเรียน</span>
                </div>
                <Link href={primaryEnrollment.continuationLessonId ? `/courses/${primaryEnrollment.course.slug}/learn/${primaryEnrollment.continuationLessonId}` : `/courses/${primaryEnrollment.course.slug}/learn`} className="dashboard-continue__course">
                  <div className="dashboard-continue__image">
                    {primaryEnrollment.course.thumbnailUrl ? <Image src={primaryEnrollment.course.thumbnailUrl.startsWith('http') ? primaryEnrollment.course.thumbnailUrl : `https://${primaryEnrollment.course.thumbnailUrl}`} alt={primaryEnrollment.course.title} fill priority sizes="(max-width: 900px) 100vw, 48vw" /> : <div className="dashboard-course-fallback"><span>MD</span><small>Learning</small></div>}
                  </div>
                  <div className="dashboard-continue__content">
                    <div className="dashboard-course-status">{primaryEnrollment.progressPercent === 100 ? 'เรียนจบแล้ว' : 'กำลังเรียน'} · {primaryEnrollment.progressPercent}%</div>
                    <h3>{primaryEnrollment.course.title}</h3>
                    <div className="dashboard-progress" aria-label={`ความคืบหน้า ${primaryEnrollment.progressPercent}%`}><span style={{ width: `${primaryEnrollment.progressPercent}%` }} /></div>
                    <div className="dashboard-continue__action"><span>{primaryEnrollment.completedAt ? 'เปิดคอร์สอีกครั้ง' : 'ไปยังบทเรียนถัดไป'}</span><span aria-hidden="true">→</span></div>
                  </div>
                </Link>
              </section>

              <section className="dashboard-courses" aria-labelledby="dashboard-courses-title">
                <div className="dashboard-section-head"><div><p>Course index</p><h2 id="dashboard-courses-title">คอร์สของฉัน</h2></div><Link href="/courses">ดูคอร์สเพิ่มเติม</Link></div>
                {remainingEnrollments.length > 0 ? <div className="dashboard-course-list">{remainingEnrollments.map((enrollment, index) => (
                  <Link key={enrollment.id} href={enrollment.continuationLessonId ? `/courses/${enrollment.course.slug}/learn/${enrollment.continuationLessonId}` : `/courses/${enrollment.course.slug}/learn`} className="dashboard-course-row">
                    <span className="dashboard-course-row__index">{String(index + 2).padStart(2, '0')}</span>
                    <div className="dashboard-course-row__title"><strong>{enrollment.course.title}</strong><span>{enrollment.completedLessons} / {enrollment.course.lessonCount} บทเรียน</span></div>
                    <div className="dashboard-progress" aria-label={`ความคืบหน้า ${enrollment.progressPercent}%`}><span style={{ width: `${enrollment.progressPercent}%` }} /></div>
                    <span className={`dashboard-course-row__status${enrollment.progressPercent === 100 ? ' is-complete' : ''}`}>{enrollment.progressPercent === 100 ? 'เรียนจบแล้ว' : `${enrollment.progressPercent}%`}</span>
                    <span className="dashboard-course-row__action">{enrollment.progressPercent === 100 ? 'ทบทวน' : 'เรียนต่อ'} →</span>
                  </Link>
                ))}</div> : <p className="dashboard-course-list__empty">คอร์สที่ลงทะเบียนทั้งหมดแสดงอยู่ด้านบนแล้ว</p>}
              </section>
            </>
          ) : (
            <section className="dashboard-empty" aria-labelledby="dashboard-empty-title">
              <p className="learner-dashboard__meta">No enrolled courses</p>
              <h2 id="dashboard-empty-title">เริ่มจากคอร์สที่ตรงกับสิ่งที่คุณอยากสร้าง</h2>
              <p>ดูผลลัพธ์ เนื้อหา และระดับราคาของแต่ละคอร์สก่อนเลือกเส้นทางแรก</p>
              <Link href="/courses">ดูคอร์สทั้งหมด <span aria-hidden="true">→</span></Link>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

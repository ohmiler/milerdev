import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/db';
import { courses, enrollments, users, lessonProgress, lessons } from '@/lib/db/schema';
import { eq, sql, desc, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}

async function getCourseWithEnrollments(courseId: string, page: number) {
  const perPage = 25;
  const offset = (page - 1) * perPage;

  const [course] = await db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
    })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);

  if (!course) return null;

  const [lessonCountResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(lessons)
    .where(eq(lessons.courseId, courseId));
  const totalLessons = lessonCountResult?.count || 0;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(enrollments)
    .where(eq(enrollments.courseId, courseId));
  const totalEnrollments = countResult?.count || 0;

  const enrolledUsers = await db
    .select({
      enrollmentId: enrollments.id,
      enrolledAt: enrollments.enrolledAt,
      progressPercent: enrollments.progressPercent,
      completedAt: enrollments.completedAt,
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      userAvatar: users.avatarUrl,
      completedLessons: sql<number>`count(distinct ${lessonProgress.lessonId})`.as('completed_lessons'),
    })
    .from(enrollments)
    .innerJoin(users, eq(enrollments.userId, users.id))
    .leftJoin(
      lessonProgress,
      and(
        eq(lessonProgress.userId, users.id),
        eq(lessonProgress.completed, true),
        sql`${lessonProgress.lessonId} IN (SELECT id FROM lessons WHERE course_id = ${courseId})`
      )
    )
    .where(eq(enrollments.courseId, courseId))
    .groupBy(enrollments.id, users.id)
    .orderBy(desc(enrollments.enrolledAt))
    .limit(perPage)
    .offset(offset);

  return {
    course,
    totalLessons,
    totalEnrollments,
    enrolledUsers,
    page,
    totalPages: Math.ceil(totalEnrollments / perPage),
  };
}

function formatDate(value: Date | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function CourseEnrollmentsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr || '1'));

  const data = await getCourseWithEnrollments(id, page);
  if (!data) notFound();

  const { course, totalLessons, totalEnrollments, enrolledUsers, totalPages } = data;
  const completedCount = enrolledUsers.filter((user) => user.completedAt).length;
  const inProgressCount = enrolledUsers.filter((user) => !user.completedAt && (user.progressPercent || 0) > 0).length;
  const notStartedCount = enrolledUsers.filter((user) => !user.completedAt && (user.progressPercent || 0) === 0).length;
  const averageProgress = enrolledUsers.length > 0
    ? Math.round(enrolledUsers.reduce((sum, user) => sum + Number(user.progressPercent || 0), 0) / enrolledUsers.length)
    : 0;

  return (
    <div className="admin-course-enrollments-page">
      <section className="admin-course-enrollments-hero">
        <div className="admin-course-enrollments-copy">
          <Link href="/admin/courses" className="admin-course-enrollments-back">
            ← กลับไปจัดการคอร์ส
          </Link>
          <span className="admin-course-enrollments-kicker">Course enrollments</span>
          <h1>ผู้เรียนในคอร์ส</h1>
          <p>
            ติดตามผู้เรียนของคอร์ส {course.title} ดูความคืบหน้า สถานะการเรียน และสัญญาณว่าผู้เรียนกำลังไปต่อหรือหยุดอยู่ตรงไหน
          </p>
        </div>

        <aside className="admin-course-enrollments-priority">
          <span className="admin-course-enrollments-kicker">Course context</span>
          <h2>{course.title}</h2>
          <p>/courses/{course.slug}</p>
          <div>
            <Link href={`/admin/courses/${course.id}/lessons`}>จัดการบทเรียน</Link>
            <Link href={`/admin/courses/${course.id}/edit`}>แก้ไขคอร์ส</Link>
          </div>
        </aside>
      </section>

      <section className="admin-course-enrollments-metrics">
        {[
          { label: 'ผู้เรียนทั้งหมด', value: totalEnrollments, detail: 'ลงทะเบียนในคอร์สนี้' },
          { label: 'เรียนจบแล้ว', value: completedCount, detail: 'นับจากหน้าปัจจุบัน' },
          { label: 'กำลังเรียน', value: inProgressCount, detail: 'มี progress มากกว่า 0%' },
          { label: 'Progress เฉลี่ย', value: `${averageProgress}%`, detail: 'ค่าเฉลี่ยของรายการที่แสดง' },
        ].map((metric, index) => (
          <article className="admin-course-enrollments-metric" key={metric.label}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{metric.value}</strong>
            <div>
              <b>{metric.label}</b>
              <p>{metric.detail}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="admin-course-enrollments-panel">
        <header>
          <div>
            <span className="admin-course-enrollments-kicker">Learner roster</span>
            <h2>รายการผู้เรียน</h2>
            <p>{totalLessons} บทเรียนในคอร์สนี้ · {notStartedCount} คนยังไม่เริ่มจากรายการที่แสดง</p>
          </div>
          <span>{enrolledUsers.length} รายการ</span>
        </header>

        {enrolledUsers.length === 0 ? (
          <div className="admin-course-enrollments-empty">
            <h3>ยังไม่มีผู้ลงทะเบียนในคอร์สนี้</h3>
            <p>เมื่อมีผู้เรียนสมัครหรือได้รับสิทธิ์คอร์ส รายการจะมาแสดงที่นี่พร้อม progress ล่าสุด</p>
          </div>
        ) : (
          <div className="admin-course-enrollments-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ผู้เรียน</th>
                  <th>ความคืบหน้า</th>
                  <th>บทเรียนที่จบ</th>
                  <th>สถานะ</th>
                  <th>วันที่ลงทะเบียน</th>
                </tr>
              </thead>
              <tbody>
                {enrolledUsers.map((user) => {
                  const progress = user.progressPercent || 0;
                  const isCompleted = Boolean(user.completedAt);
                  const isInProgress = !isCompleted && progress > 0;

                  return (
                    <tr key={user.enrollmentId}>
                      <td>
                        <div className="admin-course-enrollments-user">
                          <div className="admin-course-enrollments-avatar">
                            {user.userAvatar ? (
                              <Image src={user.userAvatar} alt="" width={40} height={40} />
                            ) : (
                              (user.userName || user.userEmail)?.[0]?.toUpperCase() || '?'
                            )}
                          </div>
                          <div>
                            <strong>{user.userName || 'ไม่ระบุชื่อ'}</strong>
                            <p>{user.userEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="admin-course-enrollments-progress">
                          <div>
                            <span style={{ width: `${progress}%` }} className={isCompleted ? 'complete' : ''} />
                          </div>
                          <b>{progress}%</b>
                        </div>
                      </td>
                      <td>{user.completedLessons}/{totalLessons}</td>
                      <td>
                        <span className={isCompleted ? 'status complete' : isInProgress ? 'status active' : 'status idle'}>
                          {isCompleted ? 'เรียนจบ' : isInProgress ? 'กำลังเรียน' : 'ยังไม่เริ่ม'}
                        </span>
                      </td>
                      <td>{formatDate(user.enrolledAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 ? (
          <footer className="admin-course-enrollments-pagination">
            {page > 1 ? <Link href={`/admin/courses/${id}/enrollments?page=${page - 1}`}>← ก่อนหน้า</Link> : <span />}
            <b>หน้า {page} / {totalPages}</b>
            {page < totalPages ? <Link href={`/admin/courses/${id}/enrollments?page=${page + 1}`}>ถัดไป →</Link> : <span />}
          </footer>
        ) : null}
      </section>


    </div>
  );
}

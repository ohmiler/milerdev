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

      <style>{`
        .admin-course-enrollments-page {
          --brand: #02abff;
          --brand-dark: #0089d6;
          --brand-soft: #eefaff;
          --ink: #102033;
          --muted: #64758b;
          --line: #dbe8f2;
          display: grid;
          gap: 18px;
          color: var(--ink);
        }

        .admin-course-enrollments-hero,
        .admin-course-enrollments-metric,
        .admin-course-enrollments-panel {
          border: 1px solid var(--line);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 12px 32px rgba(16, 32, 51, 0.06);
        }

        .admin-course-enrollments-hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
          gap: 18px;
          padding: 22px;
          background:
            linear-gradient(135deg, rgba(238, 250, 255, 0.92), rgba(255, 255, 255, 0.98) 48%),
            #ffffff;
        }

        .admin-course-enrollments-copy {
          display: grid;
          gap: 10px;
          align-content: center;
          min-height: 190px;
        }

        .admin-course-enrollments-back {
          width: fit-content;
          color: var(--muted);
          text-decoration: none;
          font-size: 0.84rem;
          font-weight: 700;
        }

        .admin-course-enrollments-kicker {
          color: var(--brand-dark);
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .admin-course-enrollments-hero h1,
        .admin-course-enrollments-priority h2,
        .admin-course-enrollments-panel h2 {
          margin: 0;
          color: var(--ink);
          line-height: 1.22;
        }

        .admin-course-enrollments-hero h1 {
          font-size: clamp(2rem, 4vw, 3.45rem);
        }

        .admin-course-enrollments-hero p,
        .admin-course-enrollments-priority p,
        .admin-course-enrollments-panel p {
          margin: 0;
          color: var(--muted);
          font-size: 0.96rem;
          line-height: 1.8;
        }

        .admin-course-enrollments-priority {
          display: grid;
          align-content: space-between;
          gap: 18px;
          padding: 20px;
          border-radius: 8px;
          background: linear-gradient(135deg, #102033, #075b8d);
          color: #ffffff;
        }

        .admin-course-enrollments-priority .admin-course-enrollments-kicker,
        .admin-course-enrollments-priority p,
        .admin-course-enrollments-priority h2 {
          color: #ffffff;
        }

        .admin-course-enrollments-priority div {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .admin-course-enrollments-priority a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          padding: 0 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.14);
          color: #ffffff;
          text-decoration: none;
          font-size: 0.8rem;
          font-weight: 800;
        }

        .admin-course-enrollments-priority a:first-child {
          background: var(--brand);
        }

        .admin-course-enrollments-metrics {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .admin-course-enrollments-metric {
          display: grid;
          gap: 12px;
          min-height: 138px;
          padding: 18px;
        }

        .admin-course-enrollments-metric > span {
          color: #a6b5c5;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .admin-course-enrollments-metric > strong {
          color: var(--ink);
          font-size: clamp(1.5rem, 2vw, 2rem);
          line-height: 1;
        }

        .admin-course-enrollments-metric p {
          margin: 4px 0 0;
          color: var(--muted);
          font-size: 0.78rem;
          line-height: 1.55;
        }

        .admin-course-enrollments-panel {
          overflow: hidden;
        }

        .admin-course-enrollments-panel header {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          padding: 20px;
          border-bottom: 1px solid var(--line);
          background: linear-gradient(180deg, #ffffff, #f7fbff);
        }

        .admin-course-enrollments-panel header > span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 36px;
          padding: 0 12px;
          border-radius: 8px;
          background: var(--brand-soft);
          color: var(--brand-dark);
          font-size: 0.8rem;
          font-weight: 800;
          white-space: nowrap;
        }

        .admin-course-enrollments-table-wrap {
          overflow-x: auto;
        }

        .admin-course-enrollments-panel table {
          width: 100%;
          min-width: 920px;
          border-collapse: collapse;
        }

        .admin-course-enrollments-panel th,
        .admin-course-enrollments-panel td {
          padding: 14px 16px;
          border-bottom: 1px solid #e8f1f8;
          font-size: 0.84rem;
          vertical-align: middle;
        }

        .admin-course-enrollments-panel th {
          color: var(--muted);
          background: #f7fbff;
          font-weight: 800;
          text-align: left;
        }

        .admin-course-enrollments-panel th:not(:first-child),
        .admin-course-enrollments-panel td:not(:first-child) {
          text-align: center;
        }

        .admin-course-enrollments-user {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .admin-course-enrollments-avatar {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          overflow: hidden;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          background: linear-gradient(135deg, var(--brand), #73d7ff);
          color: #ffffff;
          font-weight: 900;
        }

        .admin-course-enrollments-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .admin-course-enrollments-user strong {
          color: var(--ink);
          font-size: 0.9rem;
        }

        .admin-course-enrollments-user p {
          color: var(--muted);
          font-size: 0.76rem;
          line-height: 1.5;
        }

        .admin-course-enrollments-progress {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          justify-content: center;
        }

        .admin-course-enrollments-progress > div {
          width: 92px;
          height: 8px;
          overflow: hidden;
          border-radius: 999px;
          background: #e8f1f8;
        }

        .admin-course-enrollments-progress span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: var(--brand);
        }

        .admin-course-enrollments-progress span.complete {
          background: #11a66a;
        }

        .admin-course-enrollments-progress b {
          min-width: 40px;
          color: var(--ink);
          font-size: 0.78rem;
        }

        .status {
          display: inline-flex;
          align-items: center;
          min-height: 26px;
          padding: 0 10px;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 800;
          white-space: nowrap;
        }

        .status.complete {
          background: #eefbf3;
          color: #0f7a4b;
        }

        .status.active {
          background: #fff7ed;
          color: #b45309;
        }

        .status.idle {
          background: #f1f5f9;
          color: var(--muted);
        }

        .admin-course-enrollments-empty {
          display: grid;
          place-items: center;
          gap: 8px;
          padding: 56px 20px;
          text-align: center;
        }

        .admin-course-enrollments-empty h3 {
          margin: 0;
          color: var(--ink);
        }

        .admin-course-enrollments-pagination {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 10px;
          align-items: center;
          padding: 14px 16px;
          border-top: 1px solid var(--line);
          background: #fbfdff;
        }

        .admin-course-enrollments-pagination a {
          justify-self: start;
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 12px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: #ffffff;
          color: var(--ink);
          text-decoration: none;
          font-weight: 800;
          font-size: 0.82rem;
        }

        .admin-course-enrollments-pagination a:last-child {
          justify-self: end;
        }

        .admin-course-enrollments-pagination b {
          color: var(--ink);
          font-size: 0.84rem;
        }

        @media (max-width: 1180px) {
          .admin-course-enrollments-hero {
            grid-template-columns: 1fr;
          }

          .admin-course-enrollments-metrics {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .admin-course-enrollments-hero,
          .admin-course-enrollments-panel header {
            padding: 16px;
          }

          .admin-course-enrollments-copy {
            min-height: unset;
          }

          .admin-course-enrollments-metrics {
            grid-template-columns: 1fr;
          }

          .admin-course-enrollments-panel header {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}

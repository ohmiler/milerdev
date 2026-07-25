import Link from 'next/link';
import type { CSSProperties } from 'react';
import { db } from '@/lib/db';
import { courses, lessons, enrollments } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import AdminCoursesTable from '@/components/admin/AdminCoursesTable';

export const dynamic = 'force-dynamic';

async function getCourses() {
  return db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      description: courses.description,
      price: courses.price,
      promoPrice: courses.promoPrice,
      promoStartsAt: courses.promoStartsAt,
      promoEndsAt: courses.promoEndsAt,
      status: courses.status,
      thumbnailUrl: courses.thumbnailUrl,
      createdAt: courses.createdAt,
      lessonCount: sql<number>`count(distinct ${lessons.id})`.as('lesson_count'),
      enrollmentCount: sql<number>`count(distinct ${enrollments.id})`.as('enrollment_count'),
    })
    .from(courses)
    .leftJoin(lessons, eq(lessons.courseId, courses.id))
    .leftJoin(enrollments, eq(enrollments.courseId, courses.id))
    .groupBy(courses.id)
    .orderBy(desc(courses.createdAt));
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('th-TH', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export default async function AdminCoursesPage() {
  const allCourses = await getCourses();
  const totalLessons = allCourses.reduce((sum, course) => sum + Number(course.lessonCount || 0), 0);
  const totalEnrollments = allCourses.reduce((sum, course) => sum + Number(course.enrollmentCount || 0), 0);
  const publishedCount = allCourses.filter((course) => course.status === 'published').length;
  const draftCount = allCourses.filter((course) => course.status === 'draft').length;
  const archivedCount = allCourses.filter((course) => course.status === 'archived').length;
  const withoutLessonsCount = allCourses.filter((course) => Number(course.lessonCount || 0) === 0).length;
  const withoutThumbnailCount = allCourses.filter((course) => !course.thumbnailUrl).length;
  const averageLessonsPerCourse = allCourses.length > 0 ? (totalLessons / allCourses.length).toFixed(1) : '0.0';
  const readinessScore = allCourses.length > 0
    ? Math.round(((allCourses.length - withoutLessonsCount) / allCourses.length) * 100)
    : 0;

  const priorityAction = withoutLessonsCount > 0
    ? {
      href: '#course-catalog',
      label: 'ตรวจคอร์สที่ยังไม่มีบทเรียน',
      detail: `มี ${withoutLessonsCount} คอร์สที่ยังไม่พร้อมเปิดเรียน`,
      tone: 'warning',
    }
    : draftCount > 0
      ? {
        href: '#course-catalog',
        label: 'ทบทวนคอร์สร่าง',
        detail: `มี ${draftCount} คอร์สที่รอจัดการก่อนเผยแพร่`,
        tone: 'info',
      }
      : {
        href: '/admin/courses/new',
        label: 'สร้างคอร์สใหม่',
        detail: 'คลังคอร์สหลักพร้อมใช้งานแล้ว เริ่มเพิ่มรายการใหม่ได้เลย',
        tone: 'success',
      };

  const metrics = [
    { label: 'คอร์สทั้งหมด', value: allCourses.length, detail: 'รายการใน catalog' },
    { label: 'เผยแพร่แล้ว', value: publishedCount, detail: 'พร้อมขายหรือเปิดเรียน' },
    { label: 'แบบร่าง', value: draftCount, detail: 'ยังต้องตรวจต่อ' },
    { label: 'เก็บเข้าคลัง', value: archivedCount, detail: 'หยุดขายใหม่ แต่เก็บข้อมูลเดิม' },
  ];

  return (
    <div className="admin-course-page">
      <section className="admin-course-hero">
        <div className="admin-course-hero-copy">
          <span className="admin-course-kicker">Course operations</span>
          <h1>จัดการคอร์ส</h1>
          <p>
            ควบคุม catalog คอร์สจากมุมมองเดียว เห็นสถานะเผยแพร่ ความพร้อมของบทเรียน
            และรายการที่ควรจัดการต่อทันที
          </p>
        </div>

        <aside className={`admin-course-priority ${priorityAction.tone}`}>
          <div>
            <span className="admin-course-kicker">Next action</span>
            <h2>{priorityAction.label}</h2>
            <p>{priorityAction.detail}</p>
          </div>
          <Link href={priorityAction.href}>
            เปิดงาน
            <span aria-hidden="true">→</span>
          </Link>
        </aside>
      </section>

      <section className="admin-course-metrics" aria-label="สรุปสถานะคอร์ส">
        {metrics.map((metric, index) => (
          <article className="admin-course-metric" key={metric.label}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{formatCompactNumber(metric.value)}</strong>
            <div>
              <b>{metric.label}</b>
              <p>{metric.detail}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="admin-course-readiness">
        <div className="admin-course-readiness-score">
          <div className="admin-course-meter" style={{ '--course-ready': `${readinessScore}%` } as CSSProperties}>
            <strong>{readinessScore}%</strong>
          </div>
          <div>
            <span className="admin-course-kicker">Catalog readiness</span>
            <h2>ความพร้อมของคอร์ส</h2>
            <p>คำนวณจากคอร์สที่มีบทเรียนแล้วเทียบกับ catalog ทั้งหมด</p>
          </div>
        </div>

        <div className="admin-course-readiness-grid">
          <div>
            <span>บทเรียนทั้งหมด</span>
            <strong>{formatCompactNumber(totalLessons)}</strong>
          </div>
          <div>
            <span>ผู้เรียนทั้งหมด</span>
            <strong>{formatCompactNumber(totalEnrollments)}</strong>
          </div>
          <div>
            <span>เฉลี่ยบทเรียน / คอร์ส</span>
            <strong>{averageLessonsPerCourse}</strong>
          </div>
          <div>
            <span>ยังไม่มีภาพปก</span>
            <strong>{formatCompactNumber(withoutThumbnailCount)}</strong>
          </div>
        </div>
      </section>

      <div id="course-catalog">
        <AdminCoursesTable courses={allCourses} />
      </div>

      <style>{`
        .admin-course-page {
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

        .admin-course-hero,
        .admin-course-metric,
        .admin-course-readiness {
          border: 1px solid var(--line);
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 12px 32px rgba(16, 32, 51, 0.06);
        }

        .admin-course-hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
          gap: 18px;
          align-items: stretch;
          padding: 22px;
          border-radius: 8px;
          background:
            linear-gradient(135deg, rgba(238, 250, 255, 0.92), rgba(255, 255, 255, 0.98) 48%),
            #ffffff;
        }

        .admin-course-hero-copy {
          display: grid;
          gap: 10px;
          align-content: center;
          min-height: 190px;
        }

        .admin-course-kicker {
          color: var(--brand-dark);
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .admin-course-hero h1,
        .admin-course-priority h2,
        .admin-course-readiness h2 {
          margin: 0;
          color: var(--ink);
          line-height: 1.22;
        }

        .admin-course-hero h1 {
          font-size: clamp(2rem, 4vw, 3.45rem);
          letter-spacing: 0;
        }

        .admin-course-hero p,
        .admin-course-priority p,
        .admin-course-readiness p {
          margin: 0;
          max-width: 690px;
          color: var(--muted);
          font-size: 0.96rem;
          line-height: 1.8;
        }

        .admin-course-priority {
          display: grid;
          align-content: space-between;
          gap: 20px;
          padding: 20px;
          border-radius: 8px;
          background: #0b1220;
          color: #ffffff;
        }

        .admin-course-priority h2 {
          margin: 8px 0 6px;
          color: #ffffff;
          font-size: 1.35rem;
        }

        .admin-course-priority p {
          color: #b8c7dc;
        }

        .admin-course-priority.warning {
          background: linear-gradient(135deg, #102033, #5a3b08);
        }

        .admin-course-priority.success {
          background: linear-gradient(135deg, #0b1220, #0f5132);
        }

        .admin-course-priority a {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          width: fit-content;
          min-height: 44px;
          padding: 0 16px;
          border-radius: 8px;
          background: var(--brand);
          color: #ffffff;
          text-decoration: none;
          font-weight: 800;
        }

        .admin-course-metrics {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .admin-course-metric {
          display: grid;
          gap: 12px;
          min-height: 138px;
          padding: 18px;
          border-radius: 8px;
        }

        .admin-course-metric > span {
          color: #a6b5c5;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .admin-course-metric > strong {
          color: var(--ink);
          font-size: clamp(1.5rem, 2vw, 2rem);
          line-height: 1;
        }

        .admin-course-metric b,
        .admin-course-readiness-grid strong {
          color: var(--ink);
        }

        .admin-course-metric p {
          margin: 4px 0 0;
          color: var(--muted);
          font-size: 0.78rem;
          line-height: 1.55;
        }

        .admin-course-readiness {
          display: grid;
          grid-template-columns: minmax(300px, 0.9fr) minmax(0, 1.1fr);
          gap: 18px;
          align-items: center;
          padding: 20px;
          border-radius: 8px;
        }

        .admin-course-readiness-score {
          display: grid;
          grid-template-columns: 118px minmax(0, 1fr);
          gap: 18px;
          align-items: center;
        }

        .admin-course-meter {
          display: grid;
          place-items: center;
          width: 118px;
          height: 118px;
          border-radius: 999px;
          background:
            radial-gradient(circle closest-side, white 68%, transparent 69%),
            conic-gradient(var(--brand) var(--course-ready), #e8f1f8 0);
        }

        .admin-course-meter strong {
          color: var(--ink);
          font-size: 1.35rem;
        }

        .admin-course-readiness-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .admin-course-readiness-grid > div {
          min-height: 84px;
          padding: 14px;
          border: 1px solid #e8f1f8;
          border-radius: 8px;
          background: #f7fbff;
        }

        .admin-course-readiness-grid span {
          display: block;
          margin-bottom: 8px;
          color: var(--muted);
          font-size: 0.76rem;
        }

        .admin-course-readiness-grid strong {
          font-size: 1.25rem;
        }

        @media (max-width: 1180px) {
          .admin-course-hero,
          .admin-course-readiness {
            grid-template-columns: 1fr;
          }

          .admin-course-metrics,
          .admin-course-readiness-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .admin-course-page {
            gap: 14px;
          }

          .admin-course-hero,
          .admin-course-readiness {
            padding: 16px;
            border-radius: 8px;
          }

          .admin-course-hero-copy {
            min-height: unset;
          }

          .admin-course-metrics,
          .admin-course-readiness-grid,
          .admin-course-readiness-score {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

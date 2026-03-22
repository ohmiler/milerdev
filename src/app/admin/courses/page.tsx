import Link from 'next/link';
import { db } from '@/lib/db';
import { courses, lessons, enrollments } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import AdminCoursesTable from '@/components/admin/AdminCoursesTable';

export const dynamic = 'force-dynamic';

async function getCourses() {
  const allCourses = await db
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

  return allCourses;
}

export default async function AdminCoursesPage() {
  const allCourses = await getCourses();
  const publishedCount = allCourses.filter((course) => course.status === 'published').length;
  const draftCount = allCourses.filter((course) => course.status === 'draft').length;
  const withoutLessonsCount = allCourses.filter((course) => Number(course.lessonCount || 0) === 0).length;
  const withEnrollmentsCount = allCourses.filter((course) => Number(course.enrollmentCount || 0) > 0).length;

  const summaryCards = [
    { label: 'คอร์สทั้งหมด', value: allCourses.length, tone: '#2563eb', description: 'รวมทุกสถานะในระบบ' },
    { label: 'เผยแพร่แล้ว', value: publishedCount, tone: '#16a34a', description: 'คอร์สที่พร้อมขายหรือเปิดเรียนแล้ว' },
    { label: 'แบบร่าง', value: draftCount, tone: '#d97706', description: 'คอร์สที่ยังต้องจัดการก่อนเผยแพร่' },
    { label: 'ยังไม่มีบทเรียน', value: withoutLessonsCount, tone: '#dc2626', description: 'คอร์สที่ควรเติมเนื้อหาหรือจัดโครงสร้างเพิ่ม' },
    { label: 'มีผู้เรียนแล้ว', value: withEnrollmentsCount, tone: '#7c3aed', description: 'คอร์สที่มีผู้เรียนจริงในระบบ' },
  ];

  const topPriorityAction = withoutLessonsCount > 0
    ? {
      href: '#course-catalog',
      label: 'ไล่ตรวจคอร์สที่ยังไม่มีบทเรียน',
      note: `ตอนนี้มี ${withoutLessonsCount} คอร์สที่ยังไม่พร้อมสำหรับ workflow ขายหรือเปิดเรียน`,
    }
    : draftCount > 0
      ? {
        href: '#course-catalog',
        label: 'ทบทวนคอร์สแบบร่างที่รอเผยแพร่',
        note: `มี ${draftCount} คอร์สที่ยังอยู่ใน backlog การเปิดขาย`,
      }
      : {
        href: '/admin/courses/new',
        label: 'สร้างคอร์สใหม่',
        note: 'คอร์สหลักในระบบดูพร้อมใช้งานแล้ว คุณสามารถเริ่มสร้างรายการใหม่ต่อได้',
      };

  const focusItems = [
    {
      label: 'พร้อมขายแล้ว',
      value: `${publishedCount} คอร์ส`,
      detail: 'คอร์สที่เผยแพร่และพร้อมให้ผู้เรียนเข้าถึง',
    },
    {
      label: 'ต้องเติมเนื้อหา',
      value: `${withoutLessonsCount} คอร์ส`,
      detail: withoutLessonsCount > 0 ? 'ควรเติมบทเรียนก่อนผลักไปสู่การขาย' : 'ไม่มีคอร์สที่ว่างเปล่าในตอนนี้',
    },
    {
      label: 'มี traction แล้ว',
      value: `${withEnrollmentsCount} คอร์ส`,
      detail: 'คอร์สที่มีผู้เรียนจริงและควรติดตามคุณภาพต่อเนื่อง',
    },
  ];

  const averageLessonsPerCourse = allCourses.length > 0
    ? (allCourses.reduce((sum, course) => sum + Number(course.lessonCount || 0), 0) / allCourses.length).toFixed(1)
    : '0.0';

  const averageEnrollmentsPerCourse = allCourses.length > 0
    ? (allCourses.reduce((sum, course) => sum + Number(course.enrollmentCount || 0), 0) / allCourses.length).toFixed(1)
    : '0.0';

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section style={{
        background: 'linear-gradient(135deg, #f8fbff 0%, #eef6ff 36%, #fffaf4 100%)',
        border: '1px solid rgba(148,163,184,0.18)',
        borderRadius: '28px',
        padding: '32px',
        boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.65fr) minmax(300px, 0.95fr)',
          gap: '28px',
          alignItems: 'stretch',
        }}>
          <div style={{ display: 'grid', gap: '22px' }}>
            <div>
              <div style={{ color: '#0f172a', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
                Course Management
              </div>
              <h1 style={{ fontSize: '2.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px', lineHeight: 1.04, maxWidth: '760px' }}>
                จัดการ catalog คอร์สให้เห็นชัดว่าอะไรพร้อมขาย อะไรควรแก้ก่อน และอะไรเริ่มมีผลลัพธ์แล้ว
              </h1>
              <p style={{ color: '#334155', fontSize: '0.98rem', lineHeight: 1.85, maxWidth: '720px' }}>
                ตรวจทั้งความพร้อมของคอนเทนต์ สถานะการเผยแพร่ และสัญญาณจากผู้เรียนในจุดเดียว เพื่อให้ทีม admin ตัดสินใจต่อได้เร็วขึ้นโดยไม่ต้องไล่เปิดหลายหน้า
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.2fr) repeat(2, minmax(170px, 0.8fr))',
              gap: '14px',
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                color: 'white',
                borderRadius: '22px',
                padding: '22px',
                display: 'grid',
                gap: '12px',
              }}>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Catalog Focus</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.04 }}>{allCourses.length} คอร์ส</div>
                <div style={{ color: 'rgba(255,255,255,0.74)', fontSize: '0.86rem', lineHeight: 1.7 }}>
                  มอง catalog ทั้งหมดพร้อม priority action สำหรับคอร์สที่ยังไม่พร้อมผลักต่อในเชิงธุรกิจหรือคอนเทนต์
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <Link href={topPriorityAction.href} style={{ padding: '11px 14px', borderRadius: '999px', background: 'white', color: '#0f172a', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 700 }}>
                    {topPriorityAction.label} →
                  </Link>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem' }}>{topPriorityAction.note}</span>
                </div>
              </div>

              {focusItems.slice(1).map((item) => (
                <div key={item.label} style={{ background: 'rgba(255,255,255,0.76)', borderRadius: '20px', padding: '18px', border: '1px solid rgba(148,163,184,0.22)' }}>
                  <div style={{ color: '#64748b', fontSize: '0.76rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</div>
                  <div style={{ color: '#0f172a', fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.08 }}>{item.value}</div>
                  <div style={{ color: '#475569', fontSize: '0.78rem', marginTop: '8px', lineHeight: 1.6 }}>{item.detail}</div>
                </div>
              ))}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
              gap: '12px',
            }}>
              {summaryCards.map((item) => (
                <div key={item.label} style={{ padding: '12px 0' }}>
                  <div style={{ color: '#64748b', fontSize: '0.76rem', marginBottom: '6px' }}>{item.label}</div>
                  <div style={{ color: item.tone, fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.05 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '24px', padding: '22px', display: 'grid', gap: '14px', backdropFilter: 'blur(8px)' }}>
            <div>
              <div style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>Priority Queue</div>
              <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.7 }}>ใช้แผงนี้เป็นจุดเริ่มต้นสำหรับ backlog ที่กระทบความพร้อมขายหรือคุณภาพของ catalog มากที่สุด</div>
            </div>
            <Link
              href="/admin/courses/new"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: 'white',
                borderRadius: '14px',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.92rem',
              }}
            >
              <span>+ สร้างคอร์สใหม่</span>
              <span style={{ opacity: 0.9 }}>→</span>
            </Link>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ borderRadius: '16px', background: withoutLessonsCount > 0 ? '#fff7ed' : '#f0fdf4', border: `1px solid ${withoutLessonsCount > 0 ? '#fdba74' : '#86efac'}`, padding: '14px 16px' }}>
                <div style={{ color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>คอร์สที่ควรตรวจ</div>
                <div style={{ color: withoutLessonsCount > 0 ? '#dc2626' : '#16a34a', fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.1 }}>{withoutLessonsCount} คอร์ส</div>
                <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '6px', lineHeight: 1.6 }}>ยังไม่มีบทเรียน ซึ่งมักทำให้พร้อมเผยแพร่ได้ยาก</div>
              </div>
              <div style={{ borderRadius: '16px', background: draftCount > 0 ? '#fffbeb' : '#f0fdf4', border: `1px solid ${draftCount > 0 ? '#fcd34d' : '#86efac'}`, padding: '14px 16px' }}>
                <div style={{ color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>แบบร่างที่รอจัดการ</div>
                <div style={{ color: draftCount > 0 ? '#d97706' : '#16a34a', fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.1 }}>{draftCount} คอร์ส</div>
                <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '6px', lineHeight: 1.6 }}>ช่วยบอก backlog ของคอร์สที่ยังไม่เผยแพร่</div>
              </div>
              <div style={{ borderRadius: '16px', background: '#ffffff', border: '1px solid #e2e8f0', padding: '14px 16px' }}>
                <div style={{ color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>Catalog Signals</div>
                <div style={{ display: 'grid', gap: '8px', marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.8rem' }}>
                    <span style={{ color: '#64748b' }}>บทเรียนเฉลี่ยต่อคอร์ส</span>
                    <span style={{ color: '#2563eb', fontWeight: 700 }}>{averageLessonsPerCourse}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.8rem' }}>
                    <span style={{ color: '#64748b' }}>ผู้เรียนเฉลี่ยต่อคอร์ส</span>
                    <span style={{ color: '#7c3aed', fontWeight: 700 }}>{averageEnrollmentsPerCourse}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div id="course-catalog">
        <AdminCoursesTable courses={allCourses} />
      </div>
    </div>
  );
}

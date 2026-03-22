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

  const operationalStats = [
    { label: 'คอร์สทั้งหมด', value: allCourses.length, tone: '#2563eb', description: 'inventory ทั้งหมดในระบบ' },
    { label: 'เผยแพร่แล้ว', value: publishedCount, tone: '#16a34a', description: 'พร้อมขายหรือเปิดเรียน' },
    { label: 'แบบร่าง', value: draftCount, tone: '#d97706', description: 'ยังรอการจัดการก่อนเผยแพร่' },
    { label: 'ต้องเติมบทเรียน', value: withoutLessonsCount, tone: '#dc2626', description: 'คอร์สที่ยังไม่พร้อมผลักต่อ' },
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

  const actionQueue = [
    {
      label: 'คอร์สที่ยังไม่มีบทเรียน',
      value: `${withoutLessonsCount} คอร์ส`,
      detail: withoutLessonsCount > 0 ? 'ควรเริ่มจากเติมโครงสร้างบทเรียนก่อน publish' : 'ไม่มีคอร์สว่างเปล่าในตอนนี้',
      tone: withoutLessonsCount > 0 ? '#dc2626' : '#16a34a',
    },
    {
      label: 'แบบร่างที่รอทบทวน',
      value: `${draftCount} คอร์ส`,
      detail: draftCount > 0 ? 'ช่วยบอก backlog ของคอร์สที่ยังไม่ถูกเปิดขาย' : 'ไม่มีคอร์ส draft ที่ค้างอยู่',
      tone: draftCount > 0 ? '#d97706' : '#16a34a',
    },
    {
      label: 'คอร์สที่มีผู้เรียนแล้ว',
      value: `${withEnrollmentsCount} คอร์ส`,
      detail: 'ใช้ดูว่ามีรายการไหนเริ่มมี demand จริงและควรติดตามคุณภาพต่อ',
      tone: '#0f766e',
    },
  ];

  const averageLessonsPerCourse = allCourses.length > 0
    ? (allCourses.reduce((sum, course) => sum + Number(course.lessonCount || 0), 0) / allCourses.length).toFixed(1)
    : '0.0';

  const averageEnrollmentsPerCourse = allCourses.length > 0
    ? (allCourses.reduce((sum, course) => sum + Number(course.enrollmentCount || 0), 0) / allCourses.length).toFixed(1)
    : '0.0';

  const catalogSignals = [
    { label: 'เฉลี่ยบทเรียน / คอร์ส', value: averageLessonsPerCourse, tone: '#2563eb' },
    { label: 'เฉลี่ยผู้เรียน / คอร์ส', value: averageEnrollmentsPerCourse, tone: '#ea580c' },
  ];

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
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '28px',
          alignItems: 'stretch',
        }}>
          <div style={{ display: 'grid', gap: '24px' }}>
            <div>
              <div style={{ color: '#0f172a', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
                Course Management
              </div>
              <h1 style={{ fontSize: '2.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px', lineHeight: 1.04, maxWidth: '760px' }}>
                ดู catalog คอร์สแบบที่รู้เร็วขึ้นว่ารายการไหนพร้อมขาย รายการไหนยังติดคอขวด และควรเริ่มจัดการจากอะไร
              </h1>
              <p style={{ color: '#334155', fontSize: '0.98rem', lineHeight: 1.85, maxWidth: '720px' }}>
                รวมภาพรวมของคอนเทนต์ สถานะการเผยแพร่ และสัญญาณจากผู้เรียนไว้ใน flow เดียว เพื่อให้ตัดสินใจต่อจากหน้าเดียวได้โดยไม่ต้องไล่อ่านหลายกล่อง
              </p>
            </div>

            <div style={{
              display: 'grid',
              gap: '18px',
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                color: 'white',
                borderRadius: '24px',
                padding: '24px',
                display: 'grid',
                gap: '16px',
              }}>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Catalog Focus</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.04 }}>{allCourses.length} คอร์ส</div>
                <div style={{ color: 'rgba(255,255,255,0.74)', fontSize: '0.88rem', lineHeight: 1.8, maxWidth: '620px' }}>
                  ให้ hero นี้ทำหน้าที่เป็นจุดเริ่มต้นของการตัดสินใจ: เห็นขนาด catalog, action ที่ควรทำก่อน และความพร้อมโดยรวม โดยไม่ซ้ำกับ detail ในตารางด้านล่าง
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <Link href={topPriorityAction.href} style={{ padding: '11px 14px', borderRadius: '999px', background: 'white', color: '#0f172a', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 700 }}>
                    {topPriorityAction.label} →
                  </Link>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem' }}>{topPriorityAction.note}</span>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '14px',
                  paddingTop: '14px',
                  borderTop: '1px solid rgba(255,255,255,0.12)',
                }}>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.64)', fontSize: '0.75rem', marginBottom: '6px' }}>พร้อมขายแล้ว</div>
                    <div style={{ color: 'white', fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.15 }}>{publishedCount} คอร์ส</div>
                  </div>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.64)', fontSize: '0.75rem', marginBottom: '6px' }}>มีผู้เรียนแล้ว</div>
                    <div style={{ color: 'white', fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.15 }}>{withEnrollmentsCount} คอร์ส</div>
                  </div>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '16px',
                paddingTop: '4px',
                borderTop: '1px solid rgba(148,163,184,0.24)',
              }}>
              {operationalStats.map((item) => (
                <div key={item.label} style={{ padding: '12px 0' }}>
                  <div style={{ color: '#64748b', fontSize: '0.76rem', marginBottom: '6px' }}>{item.label}</div>
                  <div style={{ color: item.tone, fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.05 }}>{item.value}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '6px', lineHeight: 1.5 }}>{item.description}</div>
                </div>
              ))}
            </div>
          </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '24px', padding: '22px', display: 'grid', gap: '12px', backdropFilter: 'blur(8px)' }}>
            <div>
              <div style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>Catalog Snapshot</div>
              <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.7 }}>ใช้แผงนี้เช็ค backlog และสัญญาณหลักของ catalog ก่อนลงไปจัดการรายคอร์สในตาราง</div>
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
              {actionQueue.map((item, index) => (
                <div key={item.label} style={{ padding: index === 0 ? '10px 0 14px' : '14px 0', borderTop: index === 0 ? 'none' : '1px solid rgba(226,232,240,0.9)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: '#0f172a', fontSize: '0.9rem', fontWeight: 700, marginBottom: '6px' }}>{item.label}</div>
                      <div style={{ color: '#64748b', fontSize: '0.78rem', lineHeight: 1.7 }}>{item.detail}</div>
                    </div>
                    <div style={{ color: item.tone, fontSize: '1rem', fontWeight: 800, lineHeight: 1.15, textAlign: 'right', flexShrink: 0 }}>{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ paddingTop: '14px', borderTop: '1px solid rgba(226,232,240,0.9)' }}>
              <div style={{ color: '#0f172a', fontSize: '0.86rem', fontWeight: 700, marginBottom: '10px' }}>Catalog Signals</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
                {catalogSignals.map((item) => (
                  <div key={item.label} style={{ padding: '14px 16px', borderRadius: '16px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: '0.74rem', marginBottom: '6px' }}>{item.label}</div>
                    <div style={{ color: item.tone, fontSize: '1.3rem', fontWeight: 800, lineHeight: 1.1 }}>{item.value}</div>
                  </div>
                ))}
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

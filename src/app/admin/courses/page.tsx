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

  const averageLessonsPerCourse = allCourses.length > 0
    ? (allCourses.reduce((sum, course) => sum + Number(course.lessonCount || 0), 0) / allCourses.length).toFixed(1)
    : '0.0';

  const averageEnrollmentsPerCourse = allCourses.length > 0
    ? (allCourses.reduce((sum, course) => sum + Number(course.enrollmentCount || 0), 0) / allCourses.length).toFixed(1)
    : '0.0';

  const focusSummaryItems = [
    { label: 'พร้อมขายแล้ว', value: `${publishedCount} คอร์ส` },
    { label: 'แบบร่าง', value: `${draftCount} รายการ` },
    { label: 'เฉลี่ยบทเรียน', value: `${averageLessonsPerCourse} บท` },
    { label: 'ต้องเติมบทเรียน', value: `${withoutLessonsCount} รายการ` },
  ];

  const catalogSnapshotItems = [
    { label: 'Drafts', value: draftCount, detail: 'รายการที่ยังรอจัดการ', tone: '#64748b' },
    { label: 'Published', value: publishedCount, detail: 'พร้อมขายหรือเปิดเรียน', tone: '#1d4ed8' },
  ];

  const catalogSignals = [
    { label: 'คอร์สมีผู้เรียนแล้ว', value: `${withEnrollmentsCount} คอร์ส`, detail: 'ดูรายการที่เริ่มมี demand จริง', tone: '#0f766e' },
    { label: 'เฉลี่ยบทเรียน / คอร์ส', value: `${averageLessonsPerCourse} บท`, detail: 'วัดความหนาแน่นของเนื้อหา', tone: '#1d4ed8' },
    { label: 'เฉลี่ยผู้เรียน / คอร์ส', value: `${averageEnrollmentsPerCourse} คน`, detail: 'ใช้ดูแรงตอบรับของ catalog', tone: '#c2410c' },
  ];

  return (
    <div style={{ display: 'grid', gap: '18px' }}>
      <section style={{
        background: '#ffffff',
        border: '1px solid #dbe5f4',
        borderRadius: '22px',
        padding: '18px 20px',
        boxShadow: '0 16px 36px rgba(15, 23, 42, 0.05)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '18px',
          alignItems: 'stretch',
        }}>
          <div style={{ display: 'grid', gap: '14px' }}>
            <div>
              <div style={{ color: '#334155', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                Course Management
              </div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px', lineHeight: 1.05, maxWidth: '680px' }}>
                Course Management
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.86rem', lineHeight: 1.7, maxWidth: '720px' }}>
                สรุปภาพรวม catalog การเผยแพร่ และคอร์สที่ควรจัดการก่อนใน flow เดียว เพื่อให้ตัดสินใจต่อได้จากหน้าเดียว
              </p>
            </div>

            <div style={{
              display: 'grid',
              gap: '14px',
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 58%, #2563eb 100%)',
                color: 'white',
                borderRadius: '18px',
                padding: '22px 24px',
                display: 'grid',
                gap: '14px',
                position: 'relative',
                overflow: 'hidden',
                minHeight: '208px',
              }}>
                <div style={{ position: 'absolute', inset: 'auto -72px -84px auto', width: '210px', height: '210px', borderRadius: '999px', background: 'radial-gradient(circle, rgba(255,255,255,0.18), rgba(255,255,255,0))' }} />
                <div style={{ position: 'relative', zIndex: 1, display: 'grid', gap: '10px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Catalog Focus</div>
                  <div style={{ fontSize: '2.1rem', fontWeight: 800, lineHeight: 1 }}>{allCourses.length} Courses</div>
                  <div style={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.84rem', lineHeight: 1.7, maxWidth: '520px' }}>
                    โฟกัสขนาดของ catalog และงานสำคัญที่ควรทำก่อน เพื่อให้เห็นภาพรวมและเริ่มจัดการได้ทันที
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Link href={topPriorityAction.href} style={{ padding: '10px 14px', borderRadius: '999px', background: '#ffffff', color: '#0f172a', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700 }}>
                      {topPriorityAction.label} →
                    </Link>
                    <div style={{ color: 'rgba(255,255,255,0.74)', fontSize: '0.74rem', lineHeight: 1.6 }}>{topPriorityAction.note}</div>
                  </div>
                </div>
                <div style={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                  paddingTop: '14px',
                  borderTop: '1px solid rgba(255,255,255,0.2)',
                }}>
                  {focusSummaryItems.map((item) => (
                    <div key={item.label}>
                      <div style={{ color: 'rgba(255,255,255,0.64)', fontSize: '0.72rem', marginBottom: '6px' }}>{item.label}</div>
                      <div style={{ color: 'white', fontSize: '1.12rem', fontWeight: 700, lineHeight: 1.15 }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '12px',
              }}>
              {operationalStats.map((item) => (
                <div key={item.label} style={{ padding: '14px 16px', borderRadius: '14px', background: '#f8fbff', border: '1px solid #dbe5f4', minWidth: 0 }}>
                  <div style={{ color: '#64748b', fontSize: '0.72rem', marginBottom: '6px' }}>{item.label}</div>
                  <div style={{ color: item.tone, fontSize: '1.32rem', fontWeight: 800, lineHeight: 1.05 }}>{item.value}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginTop: '6px', lineHeight: 1.5 }}>{item.description}</div>
                </div>
              ))}
            </div>
          </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #dbe5f4', borderRadius: '18px', padding: '18px', display: 'grid', gap: '14px' }}>
            <div>
              <div style={{ color: '#0f172a', fontSize: '0.96rem', fontWeight: 700, marginBottom: '6px' }}>Catalog Snapshot</div>
              <div style={{ color: '#64748b', fontSize: '0.78rem', lineHeight: 1.65 }}>ใช้มุมนี้เช็คสถานะหลักของ catalog ก่อนลงไปจัดการรายคอร์สในตาราง</div>
            </div>
            <Link
              href="/admin/courses/new"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                padding: '15px 16px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: 'white',
                borderRadius: '12px',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              <span>Create New Course</span>
              <span style={{ opacity: 0.9 }}>→</span>
            </Link>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
              {catalogSnapshotItems.map((item) => (
                <div key={item.label} style={{ padding: '12px 14px', borderRadius: '12px', background: '#f8fbff', border: '1px solid #e6eefb' }}>
                  <div style={{ color: '#64748b', fontSize: '0.7rem', marginBottom: '5px' }}>{item.label}</div>
                  <div style={{ color: item.tone, fontSize: '1.28rem', fontWeight: 800, lineHeight: 1 }}>{item.value}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.68rem', marginTop: '5px', lineHeight: 1.5 }}>{item.detail}</div>
                </div>
              ))}
            </div>
            <div style={{ paddingTop: '14px', borderTop: '1px solid rgba(226,232,240,0.9)' }}>
              <div style={{ color: '#0f172a', fontSize: '0.82rem', fontWeight: 700, marginBottom: '10px' }}>Catalog Signals</div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {catalogSignals.map((item) => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline', paddingBottom: '10px', borderBottom: '1px solid #eef2f7' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: '#0f172a', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>{item.label}</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.68rem', lineHeight: 1.55 }}>{item.detail}</div>
                    </div>
                    <div style={{ color: item.tone, fontSize: '0.94rem', fontWeight: 800, lineHeight: 1.1, flexShrink: 0 }}>{item.value}</div>
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

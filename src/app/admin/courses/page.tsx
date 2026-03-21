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

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section style={{
        background: 'radial-gradient(circle at top left, rgba(37,99,235,0.14), rgba(255,255,255,0.98) 44%), linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: '1px solid rgba(148,163,184,0.18)',
        borderRadius: '24px',
        padding: '28px',
        boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.8fr) minmax(280px, 0.9fr)',
          gap: '20px',
          alignItems: 'stretch',
        }}>
          <div style={{ display: 'grid', gap: '18px' }}>
            <div>
              <div style={{ color: '#2563eb', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
                Course Management
              </div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px', lineHeight: 1.1 }}>
                จัดการคอร์สให้เห็นทั้งสถานะ ความพร้อมขาย และคอร์สที่ควรลงมือก่อน
              </h1>
              <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.8, maxWidth: '760px' }}>
                ใช้หน้านี้เพื่อตรวจว่าคอร์สไหนพร้อมเผยแพร่ คอร์สไหนยังขาดบทเรียน และคอร์สไหนมีผู้เรียนแล้ว เพื่อช่วยวางลำดับงานได้เร็วขึ้น
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '14px',
            }}>
              {summaryCards.map((item) => (
                <div key={item.label} style={{ background: 'white', borderRadius: '18px', padding: '18px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.05)' }}>
                  <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '8px' }}>{item.label}</div>
                  <div style={{ color: item.tone, fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.1 }}>{item.value}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '8px', lineHeight: 1.6 }}>{item.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '20px', padding: '20px', display: 'grid', gap: '14px' }}>
            <div>
              <div style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>Next Best Actions</div>
              <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.7 }}>ทางลัดสำหรับงานที่มักเกิดขึ้นบ่อยเมื่อคุณกำลังจัดการ catalog ของคอร์ส</div>
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
              <div style={{ borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '14px 16px' }}>
                <div style={{ color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>คอร์สที่ควรตรวจ</div>
                <div style={{ color: withoutLessonsCount > 0 ? '#dc2626' : '#16a34a', fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.1 }}>{withoutLessonsCount} คอร์ส</div>
                <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '6px', lineHeight: 1.6 }}>ยังไม่มีบทเรียน ซึ่งมักทำให้พร้อมเผยแพร่ได้ยาก</div>
              </div>
              <div style={{ borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '14px 16px' }}>
                <div style={{ color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>แบบร่างที่รอจัดการ</div>
                <div style={{ color: draftCount > 0 ? '#d97706' : '#16a34a', fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.1 }}>{draftCount} คอร์ส</div>
                <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '6px', lineHeight: 1.6 }}>ช่วยบอก backlog ของคอร์สที่ยังไม่เผยแพร่</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AdminCoursesTable courses={allCourses} />
    </div>
  );
}

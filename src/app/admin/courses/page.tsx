import Link from 'next/link';
import { db } from '@/lib/db';
import { courses, lessons, enrollments } from '@/lib/db/schema';
import { desc, eq, count, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

async function getCourses() {
  const allCourses = await db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      description: courses.description,
      price: courses.price,
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

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
      }}>
        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          color: '#1e293b',
        }}>
          จัดการคอร์ส ({allCourses.length})
        </h1>
        <Link
          href="/admin/courses/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: '#2563eb',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          + สร้างคอร์สใหม่
        </Link>
      </div>

      {/* Courses Table */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                คอร์ส
              </th>
              <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                สถานะ
              </th>
              <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                ราคา
              </th>
              <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                บทเรียน
              </th>
              <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                ผู้เรียน
              </th>
              <th style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}>
                การดำเนินการ
              </th>
            </tr>
          </thead>
          <tbody>
            {allCourses.map((course) => (
              <tr key={course.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      background: course.thumbnailUrl 
                        ? `url(${course.thumbnailUrl}) center/cover`
                        : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                      flexShrink: 0,
                    }} />
                    <div>
                      <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
                        {course.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        /{course.slug}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px', textAlign: 'center' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '50px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    background: course.status === 'published' ? '#dcfce7' : '#fef3c7',
                    color: course.status === 'published' ? '#16a34a' : '#d97706',
                  }}>
                    {course.status === 'published' ? 'เผยแพร่' : 'แบบร่าง'}
                  </span>
                </td>
                <td style={{ padding: '16px', textAlign: 'center', color: '#1e293b' }}>
                  {parseFloat(course.price || '0') === 0 ? (
                    <span style={{ color: '#16a34a' }}>ฟรี</span>
                  ) : (
                    `฿${parseFloat(course.price || '0').toLocaleString()}`
                  )}
                </td>
                <td style={{ padding: '16px', textAlign: 'center', color: '#1e293b' }}>
                  {course.lessonCount} บท
                </td>
                <td style={{ padding: '16px', textAlign: 'center', color: '#1e293b' }}>
                  {course.enrollmentCount} คน
                </td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <Link
                      href={`/admin/courses/${course.id}/lessons`}
                      style={{
                        padding: '8px 12px',
                        background: '#f1f5f9',
                        color: '#475569',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                      }}
                    >
                      บทเรียน
                    </Link>
                    <Link
                      href={`/admin/courses/${course.id}/edit`}
                      style={{
                        padding: '8px 12px',
                        background: '#eff6ff',
                        color: '#2563eb',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                      }}
                    >
                      แก้ไข
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {allCourses.length === 0 && (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            color: '#64748b',
          }}>
            <p>ยังไม่มีคอร์ส</p>
            <Link
              href="/admin/courses/new"
              style={{
                display: 'inline-block',
                marginTop: '16px',
                padding: '12px 20px',
                background: '#2563eb',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
              }}
            >
              สร้างคอร์สแรก
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

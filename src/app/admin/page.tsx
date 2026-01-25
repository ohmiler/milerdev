import Link from 'next/link';
import { db } from '@/lib/db';
import { courses, users, enrollments, lessons } from '@/lib/db/schema';
import { count } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

async function getStats() {
  const [coursesCount] = await db.select({ count: count() }).from(courses);
  const [usersCount] = await db.select({ count: count() }).from(users);
  const [enrollmentsCount] = await db.select({ count: count() }).from(enrollments);
  const [lessonsCount] = await db.select({ count: count() }).from(lessons);

  return {
    courses: coursesCount?.count || 0,
    users: usersCount?.count || 0,
    enrollments: enrollmentsCount?.count || 0,
    lessons: lessonsCount?.count || 0,
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  return (
    <div>
      <h1 style={{
        fontSize: '1.75rem',
        fontWeight: 700,
        color: '#1e293b',
        marginBottom: '24px',
      }}>
        แดชบอร์ด Admin
      </h1>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '40px',
      }}>
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '8px' }}>
            คอร์สทั้งหมด
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2563eb' }}>
            {stats.courses}
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '8px' }}>
            บทเรียนทั้งหมด
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#16a34a' }}>
            {stats.lessons}
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '8px' }}>
            ผู้ใช้ทั้งหมด
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>
            {stats.users}
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '8px' }}>
            การลงทะเบียน
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#8b5cf6' }}>
            {stats.enrollments}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 style={{
        fontSize: '1.25rem',
        fontWeight: 600,
        color: '#1e293b',
        marginBottom: '16px',
      }}>
        การดำเนินการด่วน
      </h2>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
        <Link
          href="/admin/courses"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: 'white',
            color: '#1e293b',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 500,
            border: '1px solid #e2e8f0',
          }}
        >
          จัดการคอร์ส
        </Link>
      </div>
    </div>
  );
}

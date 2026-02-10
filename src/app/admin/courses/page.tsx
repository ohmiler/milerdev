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

      <AdminCoursesTable courses={allCourses} />
    </div>
  );
}

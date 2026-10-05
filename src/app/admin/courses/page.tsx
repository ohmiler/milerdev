import { Plus } from 'lucide-react';
import Link from 'next/link';
import { desc, eq, sql } from 'drizzle-orm';

import AdminCoursesTable from '@/components/admin/AdminCoursesTable';
import { AdminPageHeader } from '@/components/admin/ui/AdminOperations';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { courses, enrollments, lessons } from '@/lib/db/schema';

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

export default async function AdminCoursesPage() {
  const allCourses = await getCourses();

  return (
    <div className="grid gap-6" data-admin-courses>
      <AdminPageHeader
        eyebrow="Course operations"
        title="จัดการคอร์ส"
        description="ตรวจความพร้อม ค้นหารายการ และเลือกขั้นตอนถัดไปของแต่ละคอร์สโดยไม่เปลี่ยนกติกาการเผยแพร่เดิม"
        actions={(
          <Button asChild>
            <Link href="/admin/courses/new"><Plus />สร้างคอร์ส</Link>
          </Button>
        )}
      />

      {/* Status counts live in the table's filter tabs; the table keeps the readiness cards. */}

      <AdminCoursesTable courses={allCourses} />
    </div>
  );
}

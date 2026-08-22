import { Archive, BookOpen, CircleAlert, Plus, Send } from 'lucide-react';
import Link from 'next/link';
import { desc, eq, sql } from 'drizzle-orm';

import AdminCoursesTable from '@/components/admin/AdminCoursesTable';
import { AdminMetricCard, AdminPageHeader } from '@/components/admin/ui/AdminOperations';
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

function formatNumber(value: number) {
  return new Intl.NumberFormat('th-TH').format(value);
}

export default async function AdminCoursesPage() {
  const allCourses = await getCourses();
  const publishedCount = allCourses.filter((course) => course.status === 'published').length;
  const draftCount = allCourses.filter((course) => course.status === 'draft').length;
  const archivedCount = allCourses.filter((course) => course.status === 'archived').length;
  const needsAttentionCount = allCourses.filter((course) => (
    Number(course.lessonCount || 0) === 0 || !course.thumbnailUrl?.trim()
  )).length;

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

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="สรุปสถานะคอร์ส">
        <AdminMetricCard
          label="คอร์สทั้งหมด"
          value={formatNumber(allCourses.length)}
          detail={needsAttentionCount > 0 ? `${formatNumber(needsAttentionCount)} คอร์สควรตรวจความพร้อม` : 'ไม่พบคอร์สที่ขาดบทเรียนหรือภาพปก'}
          icon={<BookOpen />}
          tone={needsAttentionCount > 0 ? 'warning' : 'success'}
        />
        <AdminMetricCard
          label="เผยแพร่แล้ว"
          value={formatNumber(publishedCount)}
          detail="พร้อมขายหรือเปิดเรียนตามกติกาปัจจุบัน"
          icon={<Send />}
          tone="success"
        />
        <AdminMetricCard
          label="แบบร่าง"
          value={formatNumber(draftCount)}
          detail="ยังไม่เปิดแสดงต่อผู้ใช้"
          icon={<CircleAlert />}
          tone={draftCount > 0 ? 'warning' : 'neutral'}
        />
        <AdminMetricCard
          label="เก็บเข้าคลัง"
          value={formatNumber(archivedCount)}
          detail="หยุดขายใหม่และคงข้อมูลเดิม"
          icon={<Archive />}
          tone="neutral"
        />
      </section>

      <AdminCoursesTable courses={allCourses} />
    </div>
  );
}

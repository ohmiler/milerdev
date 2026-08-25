import Link from 'next/link';
import { count, desc, eq, gte, sql } from 'drizzle-orm';

import AdminDashboardView, { type AdminDashboardData } from '@/app/admin/AdminDashboardView';
import { AdminEmptyState, AdminPageHeader } from '@/components/admin/ui/AdminOperations';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { courses, enrollments, lessons, payments, users } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

type AdminDashboardCacheEntry = {
  expiresAt: number;
  value: AdminDashboardData;
};

const ADMIN_DASHBOARD_CACHE_TTL_MS = 60_000;
let adminDashboardCache: AdminDashboardCacheEntry | null = null;

function sevenDayStart() {
  const start = new Date();
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return start;
}

async function getStats() {
  const [[coursesRow], [publishedRow], [usersRow], [enrollmentsRow], [lessonsRow]] = await Promise.all([
    db.select({ count: count() }).from(courses),
    db.select({ count: count() }).from(courses).where(eq(courses.status, 'published')),
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(enrollments),
    db.select({ count: count() }).from(lessons),
  ]);

  return {
    courses: Number(coursesRow?.count || 0),
    publishedCourses: Number(publishedRow?.count || 0),
    users: Number(usersRow?.count || 0),
    enrollments: Number(enrollmentsRow?.count || 0),
    lessons: Number(lessonsRow?.count || 0),
  };
}

async function getSevenDaySummary() {
  const start = sevenDayStart();
  const [[revenueRow], [enrollmentsRow]] = await Promise.all([
    db
      .select({
        total: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'completed' THEN ${payments.amount} ELSE 0 END), 0)`,
      })
      .from(payments)
      .where(gte(payments.createdAt, start)),
    db
      .select({ count: count() })
      .from(enrollments)
      .where(gte(enrollments.enrolledAt, start)),
  ]);

  return {
    revenue: Number(revenueRow?.total || 0),
    enrollments: Number(enrollmentsRow?.count || 0),
  };
}

async function getPaymentHealth() {
  const [row] = await db
    .select({
      completed: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'completed' THEN 1 ELSE 0 END), 0)`,
      pending: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'pending' THEN 1 ELSE 0 END), 0)`,
      verifying: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'verifying' THEN 1 ELSE 0 END), 0)`,
      failed: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'failed' THEN 1 ELSE 0 END), 0)`,
      refunded: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'refunded' THEN 1 ELSE 0 END), 0)`,
    })
    .from(payments);

  return {
    completed: Number(row?.completed || 0),
    pending: Number(row?.pending || 0),
    verifying: Number(row?.verifying || 0),
    failed: Number(row?.failed || 0),
    refunded: Number(row?.refunded || 0),
  };
}

async function getCourseAttention() {
  const rows = await db
    .select({
      id: courses.id,
      status: courses.status,
      thumbnailUrl: courses.thumbnailUrl,
      lessonCount: count(lessons.id),
    })
    .from(courses)
    .leftJoin(lessons, eq(lessons.courseId, courses.id))
    .groupBy(courses.id);

  return {
    draft: rows.filter((course) => course.status === 'draft').length,
    withoutLessons: rows.filter((course) => Number(course.lessonCount || 0) === 0).length,
    withoutThumbnail: rows.filter((course) => !course.thumbnailUrl?.trim()).length,
  };
}

async function getRecentEnrollments() {
  return db
    .select({
      id: enrollments.id,
      enrolledAt: enrollments.enrolledAt,
      userName: users.name,
      userEmail: users.email,
      courseTitle: courses.title,
    })
    .from(enrollments)
    .leftJoin(users, eq(enrollments.userId, users.id))
    .leftJoin(courses, eq(enrollments.courseId, courses.id))
    .orderBy(desc(enrollments.enrolledAt))
    .limit(5);
}

async function getRecentPayments() {
  return db
    .select({
      id: payments.id,
      amount: payments.amount,
      status: payments.status,
      method: payments.method,
      createdAt: payments.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(payments)
    .leftJoin(users, eq(payments.userId, users.id))
    .orderBy(desc(payments.createdAt))
    .limit(5);
}

async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const now = Date.now();
  if (adminDashboardCache && adminDashboardCache.expiresAt > now) {
    return adminDashboardCache.value;
  }

  const [stats, sevenDay, paymentHealth, courseAttention, recentEnrollments, recentPayments] = await Promise.all([
    getStats(),
    getSevenDaySummary(),
    getPaymentHealth(),
    getCourseAttention(),
    getRecentEnrollments(),
    getRecentPayments(),
  ]);

  const value: AdminDashboardData = {
    generatedAt: new Date(now),
    stats,
    sevenDay,
    paymentHealth,
    courseAttention,
    recentEnrollments,
    recentPayments,
  };

  adminDashboardCache = {
    expiresAt: now + ADMIN_DASHBOARD_CACHE_TTL_MS,
    value,
  };

  return value;
}

export default async function AdminDashboardPage() {
  let data: AdminDashboardData | null = null;

  try {
    data = await getAdminDashboardData();
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <div className="grid gap-6">
        <AdminPageHeader
          eyebrow="Operations overview"
          title="โหลดภาพรวมไม่สำเร็จ"
          description="ระบบยังไม่สามารถอ่านข้อมูลปฏิบัติการได้ในขณะนี้ และไม่ได้แสดงตัวเลขทดแทน"
        />
        <AdminEmptyState
          title="ยังแสดงข้อมูลไม่ได้"
          description="กรุณาลองโหลดหน้านี้ใหม่ หากยังพบปัญหาให้ตรวจการเชื่อมต่อฐานข้อมูล"
          tone="danger"
          action={(
            <Button asChild variant="outline">
              <Link href="/admin">ลองอีกครั้ง</Link>
            </Button>
          )}
        />
      </div>
    );
  }

  return <AdminDashboardView data={data} />;
}

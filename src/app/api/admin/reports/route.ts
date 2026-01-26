import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { payments, enrollments, users, courses, lessons } from '@/lib/db/schema';
import { desc, eq, sql, gte, lte, and, count } from 'drizzle-orm';

// GET /api/admin/reports - Get comprehensive report data
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '12'; // months
    const type = searchParams.get('type') || 'all';

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(period));

    // Overview Stats
    const [totalRevenue] = await db
      .select({
        total: sql<number>`COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0)`,
        count: sql<number>`COUNT(CASE WHEN status = 'completed' THEN 1 END)`,
      })
      .from(payments);

    const [totalUsers] = await db.select({ count: count() }).from(users);
    const [totalEnrollments] = await db.select({ count: count() }).from(enrollments);
    const [totalCourses] = await db.select({ count: count() }).from(courses);

    // Monthly Revenue (last 12 months)
    const monthlyRevenue = await db
      .select({
        month: sql<string>`DATE_FORMAT(created_at, '%Y-%m')`,
        revenue: sql<number>`COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0)`,
        transactions: sql<number>`COUNT(CASE WHEN status = 'completed' THEN 1 END)`,
      })
      .from(payments)
      .where(gte(payments.createdAt, startDate))
      .groupBy(sql`DATE_FORMAT(created_at, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(created_at, '%Y-%m')`);

    // Monthly Enrollments
    const monthlyEnrollments = await db
      .select({
        month: sql<string>`DATE_FORMAT(enrolled_at, '%Y-%m')`,
        count: sql<number>`COUNT(*)`,
      })
      .from(enrollments)
      .where(gte(enrollments.enrolledAt, startDate))
      .groupBy(sql`DATE_FORMAT(enrolled_at, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(enrolled_at, '%Y-%m')`);

    // Monthly New Users
    const monthlyUsers = await db
      .select({
        month: sql<string>`DATE_FORMAT(created_at, '%Y-%m')`,
        count: sql<number>`COUNT(*)`,
      })
      .from(users)
      .where(gte(users.createdAt, startDate))
      .groupBy(sql`DATE_FORMAT(created_at, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(created_at, '%Y-%m')`);

    // Course Performance
    const coursePerformance = await db
      .select({
        courseId: courses.id,
        courseTitle: courses.title,
        coursePrice: courses.price,
        enrollmentCount: sql<number>`COUNT(DISTINCT ${enrollments.id})`,
        completedCount: sql<number>`COUNT(DISTINCT CASE WHEN ${enrollments.completedAt} IS NOT NULL THEN ${enrollments.id} END)`,
        avgProgress: sql<number>`COALESCE(AVG(${enrollments.progressPercent}), 0)`,
      })
      .from(courses)
      .leftJoin(enrollments, eq(courses.id, enrollments.courseId))
      .groupBy(courses.id, courses.title, courses.price)
      .orderBy(desc(sql`COUNT(DISTINCT ${enrollments.id})`))
      .limit(10);

    // Revenue by Course
    const revenueByCourse = await db
      .select({
        courseId: courses.id,
        courseTitle: courses.title,
        revenue: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'completed' THEN ${payments.amount} ELSE 0 END), 0)`,
        transactions: sql<number>`COUNT(CASE WHEN ${payments.status} = 'completed' THEN 1 END)`,
      })
      .from(courses)
      .leftJoin(payments, eq(courses.id, payments.courseId))
      .groupBy(courses.id, courses.title)
      .orderBy(desc(sql`COALESCE(SUM(CASE WHEN ${payments.status} = 'completed' THEN ${payments.amount} ELSE 0 END), 0)`))
      .limit(10);

    // User Growth Stats
    const [userStats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        admins: sql<number>`COUNT(CASE WHEN role = 'admin' THEN 1 END)`,
        instructors: sql<number>`COUNT(CASE WHEN role = 'instructor' THEN 1 END)`,
        students: sql<number>`COUNT(CASE WHEN role = 'student' THEN 1 END)`,
      })
      .from(users);

    // Completion Rate
    const [completionStats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        completed: sql<number>`COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END)`,
        inProgress: sql<number>`COUNT(CASE WHEN completed_at IS NULL AND progress_percent > 0 THEN 1 END)`,
        notStarted: sql<number>`COUNT(CASE WHEN progress_percent = 0 OR progress_percent IS NULL THEN 1 END)`,
      })
      .from(enrollments);

    // Payment Method Distribution
    const paymentMethods = await db
      .select({
        method: payments.method,
        count: sql<number>`COUNT(*)`,
        revenue: sql<number>`COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0)`,
      })
      .from(payments)
      .groupBy(payments.method);

    // Recent Activity Summary (last 30 days)
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const [recentNewUsers] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(gte(users.createdAt, last30Days));

    const [recentNewEnrollments] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(enrollments)
      .where(gte(enrollments.enrolledAt, last30Days));

    const [recentRevenue] = await db
      .select({
        total: sql<number>`COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0)`,
      })
      .from(payments)
      .where(gte(payments.createdAt, last30Days));

    return NextResponse.json({
      overview: {
        totalRevenue: totalRevenue?.total || 0,
        totalTransactions: totalRevenue?.count || 0,
        totalUsers: totalUsers?.count || 0,
        totalEnrollments: totalEnrollments?.count || 0,
        totalCourses: totalCourses?.count || 0,
      },
      recentStats: {
        newUsers: recentNewUsers?.count || 0,
        newEnrollments: recentNewEnrollments?.count || 0,
        revenue: recentRevenue?.total || 0,
      },
      monthlyRevenue,
      monthlyEnrollments,
      monthlyUsers,
      coursePerformance,
      revenueByCourse,
      userStats: userStats || { total: 0, admins: 0, instructors: 0, students: 0 },
      completionStats: completionStats || { total: 0, completed: 0, inProgress: 0, notStarted: 0 },
      paymentMethods,
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}

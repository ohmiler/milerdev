import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { payments, enrollments, users, courses } from '@/lib/db/schema';
import { desc, eq, sql, gte } from 'drizzle-orm';

// Sanitize CSV field to prevent formula injection
function csvSafe(value: string | number | null | undefined): string {
  const str = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  if (/[,"\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// GET /api/admin/reports/export - Export data as CSV
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'payments';
    const period = searchParams.get('period') || '12';

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(period));

    let csvContent = '';
    let filename = '';

    switch (type) {
      case 'payments': {
        const data = await db
          .select({
            id: payments.id,
            amount: payments.amount,
            status: payments.status,
            method: payments.method,
            createdAt: payments.createdAt,
            userName: users.name,
            userEmail: users.email,
            courseTitle: courses.title,
          })
          .from(payments)
          .leftJoin(users, eq(payments.userId, users.id))
          .leftJoin(courses, eq(payments.courseId, courses.id))
          .where(gte(payments.createdAt, startDate))
          .orderBy(desc(payments.createdAt));

        csvContent = 'ID,จำนวนเงิน,สถานะ,วิธีชำระ,วันที่,ชื่อผู้ใช้,อีเมล,คอร์ส\n';
        data.forEach(row => {
          csvContent += `${csvSafe(row.id)},${csvSafe(row.amount)},${csvSafe(row.status)},${csvSafe(row.method)},${csvSafe(row.createdAt?.toISOString())},${csvSafe(row.userName)},${csvSafe(row.userEmail)},${csvSafe(row.courseTitle)}\n`;
        });
        filename = `payments-report-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      }

      case 'enrollments': {
        const data = await db
          .select({
            id: enrollments.id,
            enrolledAt: enrollments.enrolledAt,
            progressPercent: enrollments.progressPercent,
            completedAt: enrollments.completedAt,
            userName: users.name,
            userEmail: users.email,
            courseTitle: courses.title,
          })
          .from(enrollments)
          .leftJoin(users, eq(enrollments.userId, users.id))
          .leftJoin(courses, eq(enrollments.courseId, courses.id))
          .where(gte(enrollments.enrolledAt, startDate))
          .orderBy(desc(enrollments.enrolledAt));

        csvContent = 'ID,วันที่ลงทะเบียน,ความคืบหน้า(%),วันที่เรียนจบ,ชื่อผู้ใช้,อีเมล,คอร์ส\n';
        data.forEach(row => {
          csvContent += `${csvSafe(row.id)},${csvSafe(row.enrolledAt?.toISOString())},${row.progressPercent || 0},${csvSafe(row.completedAt?.toISOString())},${csvSafe(row.userName)},${csvSafe(row.userEmail)},${csvSafe(row.courseTitle)}\n`;
        });
        filename = `enrollments-report-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      }

      case 'users': {
        const data = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            createdAt: users.createdAt,
            enrollmentCount: sql<number>`(SELECT COUNT(*) FROM enrollments WHERE user_id = ${users.id})`,
          })
          .from(users)
          .orderBy(desc(users.createdAt));

        csvContent = 'ID,ชื่อ,อีเมล,บทบาท,วันที่สมัคร,จำนวนคอร์สที่ลงทะเบียน\n';
        data.forEach(row => {
          csvContent += `${csvSafe(row.id)},${csvSafe(row.name)},${csvSafe(row.email)},${csvSafe(row.role)},${csvSafe(row.createdAt?.toISOString())},${row.enrollmentCount}\n`;
        });
        filename = `users-report-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      }

      case 'courses': {
        const data = await db
          .select({
            id: courses.id,
            title: courses.title,
            price: courses.price,
            status: courses.status,
            createdAt: courses.createdAt,
            enrollmentCount: sql<number>`(SELECT COUNT(*) FROM enrollments WHERE course_id = ${courses.id})`,
            revenue: sql<number>`(SELECT COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) FROM payments WHERE course_id = ${courses.id})`,
          })
          .from(courses)
          .orderBy(desc(courses.createdAt));

        csvContent = 'ID,ชื่อคอร์ส,ราคา,สถานะ,วันที่สร้าง,จำนวนการลงทะเบียน,รายได้\n';
        data.forEach(row => {
          csvContent += `${csvSafe(row.id)},${csvSafe(row.title)},${csvSafe(row.price)},${csvSafe(row.status)},${csvSafe(row.createdAt?.toISOString())},${row.enrollmentCount},${row.revenue}\n`;
        });
        filename = `courses-report-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      }

      case 'revenue-monthly': {
        const data = await db
          .select({
            month: sql<string>`DATE_FORMAT(created_at, '%Y-%m')`,
            revenue: sql<number>`COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0)`,
            transactions: sql<number>`COUNT(CASE WHEN status = 'completed' THEN 1 END)`,
          })
          .from(payments)
          .where(gte(payments.createdAt, startDate))
          .groupBy(sql`DATE_FORMAT(created_at, '%Y-%m')`)
          .orderBy(sql`DATE_FORMAT(created_at, '%Y-%m')`);

        csvContent = 'เดือน,รายได้,จำนวนรายการ\n';
        data.forEach(row => {
          csvContent += `${row.month},${row.revenue},${row.transactions}\n`;
        });
        filename = `monthly-revenue-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }

    // Add BOM for UTF-8 support in Excel
    const bom = '\uFEFF';
    const finalContent = bom + csvContent;

    return new NextResponse(finalContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล' },
      { status: 500 }
    );
  }
}

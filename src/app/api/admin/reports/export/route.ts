import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { requireAdmin } from '@/lib/auth-helpers';
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

const EXPORT_MAX_PERIOD_MONTHS = 24;
const EXPORT_BATCH_SIZE = 250;

function buildBatchedCsvStream<T>(
  header: string,
  fetchBatch: (offset: number, limit: number) => Promise<T[]>,
  mapRow: (row: T) => string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode('\uFEFF'));
      controller.enqueue(encoder.encode(header));

      let offset = 0;

      while (true) {
        const rows = await fetchBatch(offset, EXPORT_BATCH_SIZE);
        if (rows.length === 0) {
          controller.close();
          return;
        }

        for (const row of rows) {
          controller.enqueue(encoder.encode(mapRow(row)));
        }

        offset += rows.length;
        if (rows.length < EXPORT_BATCH_SIZE) {
          controller.close();
          return;
        }
      }
    },
  });
}

// GET /api/admin/reports/export - Export data as CSV
export async function GET(request: Request) {
  try {
    const authResult = await requireAdmin();

    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'payments';
    const periodRaw = parseInt(searchParams.get('period') || '12', 10);
    const period = Number.isFinite(periodRaw) && periodRaw > 0
      ? Math.min(periodRaw, EXPORT_MAX_PERIOD_MONTHS)
      : 12;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - period);

    let csvStream: ReadableStream<Uint8Array> | null = null;
    let filename = '';

    switch (type) {
      case 'payments': {
        csvStream = buildBatchedCsvStream(
          'ID,จำนวนเงิน,สถานะ,วิธีชำระ,วันที่,ชื่อผู้ใช้,อีเมล,คอร์ส\n',
          (offset, limit) =>
            db
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
              .orderBy(desc(payments.createdAt))
              .limit(limit)
              .offset(offset),
          (row) => `${csvSafe(row.id)},${csvSafe(row.amount)},${csvSafe(row.status)},${csvSafe(row.method)},${csvSafe(row.createdAt?.toISOString())},${csvSafe(row.userName)},${csvSafe(row.userEmail)},${csvSafe(row.courseTitle)}\n`
        );
        filename = `payments-report-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      }

      case 'enrollments': {
        csvStream = buildBatchedCsvStream(
          'ID,วันที่ลงทะเบียน,ความคืบหน้า(%),วันที่เรียนจบ,ชื่อผู้ใช้,อีเมล,คอร์ส\n',
          (offset, limit) =>
            db
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
              .orderBy(desc(enrollments.enrolledAt))
              .limit(limit)
              .offset(offset),
          (row) => `${csvSafe(row.id)},${csvSafe(row.enrolledAt?.toISOString())},${row.progressPercent || 0},${csvSafe(row.completedAt?.toISOString())},${csvSafe(row.userName)},${csvSafe(row.userEmail)},${csvSafe(row.courseTitle)}\n`
        );
        filename = `enrollments-report-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      }

      case 'users': {
        const enrollmentCounts = await db
          .select({
            userId: enrollments.userId,
            enrollmentCount: sql<number>`COUNT(*)`,
          })
          .from(enrollments)
          .groupBy(enrollments.userId);

        const enrollmentCountMap = new Map(
          enrollmentCounts.map((row) => [row.userId, Number(row.enrollmentCount || 0)])
        );

        csvStream = buildBatchedCsvStream(
          'ID,ชื่อ,อีเมล,บทบาท,วันที่สมัคร,จำนวนคอร์สที่ลงทะเบียน\n',
          (offset, limit) =>
            db
              .select({
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role,
                createdAt: users.createdAt,
              })
              .from(users)
              .orderBy(desc(users.createdAt))
              .limit(limit)
              .offset(offset),
          (row) => `${csvSafe(row.id)},${csvSafe(row.name)},${csvSafe(row.email)},${csvSafe(row.role)},${csvSafe(row.createdAt?.toISOString())},${enrollmentCountMap.get(row.id) || 0}\n`
        );
        filename = `users-report-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      }

      case 'courses': {
        const [enrollmentCounts, revenueRows] = await Promise.all([
          db
            .select({
              courseId: enrollments.courseId,
              enrollmentCount: sql<number>`COUNT(*)`,
            })
            .from(enrollments)
            .groupBy(enrollments.courseId),
          db
            .select({
              courseId: payments.courseId,
              revenue: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'completed' THEN ${payments.amount} ELSE 0 END), 0)`,
            })
            .from(payments)
            .groupBy(payments.courseId),
        ]);

        const enrollmentCountMap = new Map(
          enrollmentCounts.map((row) => [row.courseId, Number(row.enrollmentCount || 0)])
        );
        const revenueMap = new Map(
          revenueRows.map((row) => [row.courseId, Number(row.revenue || 0)])
        );

        csvStream = buildBatchedCsvStream(
          'ID,ชื่อคอร์ส,ราคา,สถานะ,วันที่สร้าง,จำนวนการลงทะเบียน,รายได้\n',
          (offset, limit) =>
            db
              .select({
                id: courses.id,
                title: courses.title,
                price: courses.price,
                status: courses.status,
                createdAt: courses.createdAt,
              })
              .from(courses)
              .orderBy(desc(courses.createdAt))
              .limit(limit)
              .offset(offset),
          (row) => `${csvSafe(row.id)},${csvSafe(row.title)},${csvSafe(row.price)},${csvSafe(row.status)},${csvSafe(row.createdAt?.toISOString())},${enrollmentCountMap.get(row.id) || 0},${revenueMap.get(row.id) || 0}\n`
        );
        filename = `courses-report-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      }

      case 'revenue-monthly': {
        csvStream = buildBatchedCsvStream(
          'เดือน,รายได้,จำนวนรายการ\n',
          (offset, limit) =>
            db
              .select({
                month: sql<string>`DATE_FORMAT(created_at, '%Y-%m')`,
                revenue: sql<number>`COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0)`,
                transactions: sql<number>`COUNT(CASE WHEN status = 'completed' THEN 1 END)`,
              })
              .from(payments)
              .where(gte(payments.createdAt, startDate))
              .groupBy(sql`DATE_FORMAT(created_at, '%Y-%m')`)
              .orderBy(sql`DATE_FORMAT(created_at, '%Y-%m')`)
              .limit(limit)
              .offset(offset),
          (row) => `${row.month},${row.revenue},${row.transactions}\n`
        );
        filename = `monthly-revenue-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }

    if (!csvStream) {
      return NextResponse.json({ error: 'ไม่สามารถส่งออกข้อมูลได้' }, { status: 500 });
    }

    return new Response(csvStream, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error exporting data:' });
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล' },
      { status: 500 }
    );
  }
}

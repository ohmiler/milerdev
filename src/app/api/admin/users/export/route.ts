import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { enrollments, users } from '@/lib/db/schema';
import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { adminUserLifecycleFilterSchema } from '@/lib/validations/admin';

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

// GET /api/admin/users/export - Export users as CSV
export async function GET(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const statusResult = adminUserLifecycleFilterSchema.safeParse(searchParams.get('status') || 'all');
    if (!statusResult.success) {
      return NextResponse.json(
        { error: 'ตัวกรองสถานะบัญชีไม่ถูกต้อง', code: 'INVALID_FILTER' },
        { status: 400 },
      );
    }

    const conditions = [];
    if (role && role !== 'all') {
      conditions.push(eq(users.role, role as 'admin' | 'instructor' | 'student'));
    }
    if (statusResult.data === 'active') {
      conditions.push(isNull(users.deactivatedAt));
    } else if (statusResult.data === 'inactive') {
      conditions.push(isNotNull(users.deactivatedAt));
    }

    const enrollmentCounts = db
      .select({
        userId: enrollments.userId,
        enrollmentCount: sql<number>`COUNT(*)`.as('enrollment_count'),
      })
      .from(enrollments)
      .groupBy(enrollments.userId)
      .as('enrollment_counts');

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
    const csvStream = buildBatchedCsvStream(
      'ID,ชื่อ,อีเมล,บทบาท,ยืนยันอีเมล,วันที่สมัคร,จำนวนคอร์สที่ลงทะเบียน,lifecycle_status,deactivated_at\n',
      (offset, limit) =>
        db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            emailVerifiedAt: users.emailVerifiedAt,
            createdAt: users.createdAt,
            deactivatedAt: users.deactivatedAt,
            enrollmentCount: sql<number>`COALESCE(${enrollmentCounts.enrollmentCount}, 0)`,
          })
          .from(users)
          .leftJoin(enrollmentCounts, eq(enrollmentCounts.userId, users.id))
          .where(whereCondition)
          .orderBy(desc(users.createdAt))
          .limit(limit)
          .offset(offset),
      (user) => {
        const verified = user.emailVerifiedAt ? 'ใช่' : 'ไม่';
        const createdAt = user.createdAt ? new Date(user.createdAt).toISOString() : '';
        const lifecycleStatus = user.deactivatedAt === null ? 'active' : 'inactive';
        const deactivatedAt = user.deactivatedAt ? new Date(user.deactivatedAt).toISOString() : '';
        return `${csvSafe(user.id)},${csvSafe(user.name)},${csvSafe(user.email)},${csvSafe(user.role)},${csvSafe(verified)},${csvSafe(createdAt)},${Number(user.enrollmentCount || 0)},${lifecycleStatus},${csvSafe(deactivatedAt)}\n`;
      }
    );

    const filename = `users-export-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvStream, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error exporting users:' });
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล' },
      { status: 500 }
    );
  }
}

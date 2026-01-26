import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { desc, sql, eq } from 'drizzle-orm';

// GET /api/admin/users/export - Export users as CSV
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    // Build query
    const conditions = [];
    if (role && role !== 'all') {
      conditions.push(eq(users.role, role as 'admin' | 'instructor' | 'student'));
    }

    // Get all users
    const userList = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        emailVerifiedAt: users.emailVerifiedAt,
        createdAt: users.createdAt,
        enrollmentCount: sql<number>`(SELECT COUNT(*) FROM enrollments WHERE enrollments.user_id = ${users.id})`,
      })
      .from(users)
      .where(conditions.length > 0 ? conditions[0] : undefined)
      .orderBy(desc(users.createdAt));

    // Build CSV
    let csvContent = 'ID,ชื่อ,อีเมล,บทบาท,ยืนยันอีเมล,วันที่สมัคร,จำนวนคอร์สที่ลงทะเบียน\n';
    
    userList.forEach(user => {
      const verified = user.emailVerifiedAt ? 'ใช่' : 'ไม่';
      const createdAt = user.createdAt ? new Date(user.createdAt).toISOString() : '';
      csvContent += `${user.id},"${user.name || ''}",${user.email},${user.role},${verified},${createdAt},${user.enrollmentCount}\n`;
    });

    // Add BOM for UTF-8 support in Excel
    const bom = '\uFEFF';
    const finalContent = bom + csvContent;

    const filename = `users-export-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(finalContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting users:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล' },
      { status: 500 }
    );
  }
}

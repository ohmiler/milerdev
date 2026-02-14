import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { certificates, users } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { issueCertificate } from '@/lib/certificate';

// GET /api/admin/certificates - List all certificates
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    const conditions = [];
    if (search) {
      conditions.push(
        sql`(${certificates.recipientName} LIKE ${'%' + search + '%'} OR ${certificates.certificateCode} LIKE ${'%' + search + '%'} OR ${certificates.courseTitle} LIKE ${'%' + search + '%'})`
      );
    }
    if (status === 'active') {
      conditions.push(sql`${certificates.revokedAt} IS NULL`);
    } else if (status === 'revoked') {
      conditions.push(sql`${certificates.revokedAt} IS NOT NULL`);
    }

    const whereClause = conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined;

    const allCerts = await db
      .select({
        id: certificates.id,
        certificateCode: certificates.certificateCode,
        recipientName: certificates.recipientName,
        courseTitle: certificates.courseTitle,
        completedAt: certificates.completedAt,
        issuedAt: certificates.issuedAt,
        revokedAt: certificates.revokedAt,
        revokedReason: certificates.revokedReason,
        userId: certificates.userId,
        courseId: certificates.courseId,
        userEmail: users.email,
      })
      .from(certificates)
      .leftJoin(users, eq(certificates.userId, users.id))
      .where(whereClause)
      .orderBy(desc(certificates.issuedAt));

    return NextResponse.json({ certificates: allCerts });
  } catch (error) {
    console.error('Error fetching certificates:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// POST /api/admin/certificates - Manually issue a certificate
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, courseId } = await request.json();

    if (!userId || !courseId) {
      return NextResponse.json({ error: 'กรุณาระบุผู้ใช้และคอร์ส' }, { status: 400 });
    }

    const { certificate, isNew } = await issueCertificate(userId, courseId);

    return NextResponse.json({
      message: isNew ? 'ออกใบรับรองสำเร็จ' : 'ผู้เรียนมีใบรับรองอยู่แล้ว',
      certificate,
      isNew,
    }, { status: isNew ? 201 : 200 });
  } catch (error) {
    console.error('Error issuing certificate:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

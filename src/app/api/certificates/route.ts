import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { certificates } from '@/lib/db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';

// GET /api/certificates - Get current user's certificates
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userCerts = await db
      .select()
      .from(certificates)
      .where(
        and(
          eq(certificates.userId, session.user.id),
          isNull(certificates.revokedAt)
        )
      )
      .orderBy(desc(certificates.issuedAt));

    return NextResponse.json({ certificates: userCerts });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error fetching user certificates:' });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

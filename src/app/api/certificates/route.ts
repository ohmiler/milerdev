import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { getOwnerCertificateCollection } from '@/lib/certificate-credentials';
import { logError } from '@/lib/error-handler';

// GET /api/certificates - Get the current owner's certificate projection.
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const collection = await getOwnerCertificateCollection(session.user.id);
    return NextResponse.json({ collection }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      action: 'certificate.collection.failed',
    });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

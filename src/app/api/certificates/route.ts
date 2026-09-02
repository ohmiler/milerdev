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
    const legacyActiveCertificates = collection.items.flatMap((item) => (
      item.kind === 'active'
        ? [{
          id: item.code,
          certificateCode: item.code,
          recipientName: item.recipientName,
          courseTitle: item.courseTitle,
          completedAt: item.completedAt,
          issuedAt: item.issuedAt,
        }]
        : []
    ));

    return NextResponse.json({
      collection,
      // Temporary compatibility for the current dashboard. Issue #52 moves it
      // to the status-aware collection and removes this active-only shape.
      certificates: legacyActiveCertificates,
    });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      action: 'certificate.collection.failed',
    });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/auth-helpers';
import { logError } from '@/lib/error-handler';
import { measurementQualificationService } from '@/lib/measurement-qualification';

export async function GET() {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse || authResult instanceof Response) return authResult;

  try {
    const report = await measurementQualificationService.getReport();
    return NextResponse.json(report, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    logError(error instanceof Error ? error : new Error('Measurement qualification failed'), {
      action: 'measurement_qualification_report',
    });
    return NextResponse.json(
      { error: 'Unable to build measurement qualification report' },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
}

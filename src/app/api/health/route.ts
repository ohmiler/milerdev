import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RESPONSE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);

    return NextResponse.json(
      { status: 'ok' },
      { headers: RESPONSE_HEADERS },
    );
  } catch {
    return NextResponse.json(
      { status: 'unavailable' },
      { status: 503, headers: RESPONSE_HEADERS },
    );
  }
}

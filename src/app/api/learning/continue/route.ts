import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logError } from '@/lib/error-handler';
import { getContinueLearning } from '@/lib/learning/dashboard';

// GET /api/learning/continue - the signed-in member's next lesson, for the "เรียนต่อ" card in the
// mobile menu. Read-only, about the caller only; null when no course is in progress.
export async function GET() {
    const session = await auth();
    const memberId = session?.user?.id;
    if (!memberId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const learning = await getContinueLearning(memberId);
        return NextResponse.json({ learning }, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
        logError(error, { action: 'learning.continue.load_failed' });
        return NextResponse.json({ learning: null }, { status: 500 });
    }
}

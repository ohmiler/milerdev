import { NextResponse } from 'next/server';
import { auth } from './auth';

type AuthSession = {
    user: {
        id: string;
        name?: string | null;
        email?: string | null;
        role: string;
    };
};

/**
 * Require authenticated user. Returns session or NextResponse 401.
 * Usage: const result = await requireAuth();
 *        if (result instanceof NextResponse) return result;
 *        const { session } = result;
 */
export async function requireAuth(): Promise<{ session: AuthSession } | NextResponse> {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return { session: session as AuthSession };
}

/**
 * Require admin role. Returns session or NextResponse 401/403.
 * Usage: const result = await requireAdmin();
 *        if (result instanceof NextResponse) return result;
 *        const { session } = result;
 */
export async function requireAdmin(): Promise<{ session: AuthSession } | NextResponse> {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return { session: session as AuthSession };
}

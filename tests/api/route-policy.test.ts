import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auth } from '@/lib/auth';

/**
 * Route policy inventory.
 *
 * Every `src/app/api/**\/route.ts` must be classified below, and every handler of an admin
 * route must deny callers without an admin session. A new route file that is not listed fails
 * this test, so a route cannot ship without someone deciding who may call it.
 *
 * This is a safety net for later guard consolidation; it changes no runtime behavior.
 * Classes: public (no session needed), auth (any signed-in member), admin, signature
 * (authenticated by a provider signature), delegated (authenticated by a library).
 */

type RouteClass = 'public' | 'auth' | 'admin' | 'signature' | 'delegated' | 'mixed';

const MANIFEST: Record<string, RouteClass> = {
    'auth/[...nextauth]/route.ts': 'delegated',
    'auth/change-password/route.ts': 'auth',
    'auth/register/confirm/route.ts': 'public',
    'auth/register/route.ts': 'public',
    'auth/reset-password/confirm/route.ts': 'public',
    'auth/reset-password/route.ts': 'public',
    'bundles/enroll/route.ts': 'auth',
    'bundles/route.ts': 'public',
    'bundles/slip/verify/route.ts': 'mixed',
    'certificates/repair/route.ts': 'auth',
    'certificates/route.ts': 'auth',
    'checkout/review/route.ts': 'auth',
    'contact/route.ts': 'public',
    'courses/[slug]/reviews/route.ts': 'mixed',
    'courses/route.ts': 'mixed',
    'enroll/route.ts': 'auth',
    'enrollments/check/route.ts': 'mixed',
    'enrollments/route.ts': 'auth',
    'health/route.ts': 'public',
    'learning/continue/route.ts': 'auth',
    'lessons/[lessonId]/quiz/attempts/route.ts': 'auth',
    'image-proxy/route.ts': 'mixed',
    'payments/route.ts': 'auth',
    'profile/route.ts': 'auth',
    'progress/route.ts': 'auth',
    'promptpay/intents/route.ts': 'auth',
    'slip/verify/route.ts': 'mixed',
    'stripe/bundle-checkout/route.ts': 'auth',
    'stripe/checkout/route.ts': 'auth',
    'stripe/webhook/route.ts': 'signature',
    'tags/route.ts': 'public',
    // Guards itself with an inline role check although it lives outside /admin.
    'upload/route.ts': 'admin',
};

const ADMIN_ROUTES = [
    'audit-logs',
    'bundles/[id]', 'bundles', 'certificates/[id]', 'certificates',
    'courses/[id]/lessons/reorder', 'courses/[id]/lessons', 'courses/[id]/sections/[sectionId]',
    'courses/[id]/sections', 'courses/[id]', 'courses', 'enrollments/[id]', 'enrollments', 'lessons/[lessonId]/quiz', 'lessons/[lessonId]',
    'media/[id]', 'media', 'payments/[id]', 'payments/cleanup', 'payments',
    'reconciliation/[paymentId]/retry', 'reconciliation/[paymentId]', 'reconciliation',
    'reports/export', 'reports', 'reviews/[id]', 'reviews',
    'settings', 'tags/[id]', 'tags', 'users/[id]/enrollments', 'users/[id]/instructor-profile', 'users/[id]/reset-password',
    'users/[id]', 'users/bulk', 'users/export', 'users',
];
for (const r of ADMIN_ROUTES) MANIFEST[`admin/${r}/route.ts`] = 'admin';

/**
 * KNOWN DEVIATION: these admin handlers check the role inline and answer 401 (not 403) to a
 * signed-in non-admin. Pinned on purpose; when one is moved to requireAdmin() the test will
 * fail and the entry must be removed, which is how this list is meant to shrink.
 */
const STUDENT_GETS_401 = new Set([
    'admin/bundles/[id]/route.ts',
    'admin/bundles/route.ts',

    'admin/courses/[id]/lessons/route.ts',
    'admin/lessons/[lessonId]/route.ts',
    'admin/reconciliation/[paymentId]/retry/route.ts',
    'admin/reconciliation/[paymentId]/route.ts',
    'admin/reconciliation/route.ts',
    'upload/route.ts',
]);

/**
 * KNOWN DEVIATION: admin server pages that query the database while relying on the guard in
 * src/app/admin/layout.tsx alone. A fourth entry here should be a conscious decision.
 */
const ADMIN_PAGES_WITHOUT_PAGE_GUARD = new Set([
    'admin/page.tsx',
    'admin/courses/page.tsx',
    'admin/courses/[id]/enrollments/page.tsx',
]);

const routeModules = import.meta.glob('../../src/app/api/**/route.ts') as Record<
    string,
    () => Promise<Record<string, unknown>>
>;
const adminPageSources = import.meta.glob('../../src/app/admin/**/page.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
}) as Record<string, string>;

const relRoute = (key: string) => key.replace('../../src/app/api/', '');
const relAdminPage = (key: string) => key.replace('../../src/app/', '');
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

async function call(key: string, method: (typeof METHODS)[number]) {
    const mod = await routeModules[key]();
    const handler = mod[method] as Handler | undefined;
    if (!handler) return null;
    const request = new Request('http://localhost:3000/api/policy-check', {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(method === 'GET' || method === 'DELETE' ? {} : { body: '{}' }),
    });
    const params = Promise.resolve({
        id: 'x', lessonId: 'x', paymentId: 'x', sectionId: 'x', slug: 'x',
    });
    return handler(request, { params });
}

const mockedAuth = vi.mocked(auth) as unknown as { mockResolvedValue: (v: unknown) => void };

describe('route policy inventory', () => {
    const keys = Object.keys(routeModules).sort();

    it('finds the route files', () => {
        expect(keys.length).toBeGreaterThan(50);
    });

    it('classifies every route file', () => {
        const unclassified = keys.map(relRoute).filter((r) => !(r in MANIFEST));
        expect(unclassified, 'add the new route to MANIFEST with its access class').toEqual([]);
    });

    it('lists no route that no longer exists', () => {
        const present = new Set(keys.map(relRoute));
        expect(Object.keys(MANIFEST).filter((r) => !present.has(r))).toEqual([]);
    });

    it('classifies everything under admin/ as admin', () => {
        const wrong = Object.entries(MANIFEST).filter(([r, c]) => r.startsWith('admin/') && c !== 'admin');
        expect(wrong).toEqual([]);
    });

    it('keeps the known 401 deviations limited to admin routes', () => {
        for (const r of STUDENT_GETS_401) expect(MANIFEST[r]).toBe('admin');
    });
});

describe('admin route handlers deny callers without an admin session', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const adminKeys = Object.keys(routeModules)
        .sort()
        .filter((k) => MANIFEST[relRoute(k)] === 'admin');

    for (const key of adminKeys) {
        const rel = relRoute(key);
        for (const method of METHODS) {
            it(`${method} ${rel}`, async () => {
                const mod = await routeModules[key]();
                if (!mod[method]) return;

                mockedAuth.mockResolvedValue(null);
                const anonymous = await call(key, method);
                expect(anonymous?.status, 'no session').toBe(401);

                for (const role of ['student', 'instructor']) {
                    mockedAuth.mockResolvedValue({ user: { id: 'member-1', role } });
                    const res = await call(key, method);
                    expect(res?.status, `${role} session`).toBe(STUDENT_GETS_401.has(rel) ? 401 : 403);
                }
            });
        }
    }
});

describe('admin server pages that read the database', () => {
    it('either guard the page or are listed as known deviations', () => {
        const unguarded = Object.entries(adminPageSources)
            .filter(([, src]) => /from ['"]@\/lib\/db['"]/.test(src))
            .filter(([, src]) => !/requireAdmin|requireAdminPage|\bauth\(\)/.test(src))
            .map(([k]) => relAdminPage(k))
            .sort();
        expect(unguarded).toEqual([...ADMIN_PAGES_WITHOUT_PAGE_GUARD].sort());
    });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    requireAdmin: vi.fn(),
    transition: vi.fn(),
    getAuditContext: vi.fn(),
    revalidatePath: vi.fn(),
    dbLimit: vi.fn(),
    dbUpdate: vi.fn(),
    dbSet: vi.fn(),
    dbWhere: vi.fn(),
    dbDelete: vi.fn(),
}));

vi.mock('@/lib/auth-helpers', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/auditLog', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/auditLog')>()),
    getAuditContext: mocks.getAuditContext,
    logAudit: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('@/lib/error-handler', () => ({ logError: vi.fn() }));
vi.mock('@/lib/notify', () => ({ notify: vi.fn() }));
vi.mock('@/lib/db', () => ({
    db: {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: mocks.dbLimit,
        update: mocks.dbUpdate,
        delete: mocks.dbDelete,
    },
}));
vi.mock('@/lib/course-lifecycle', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/course-lifecycle')>()),
    courseLifecycleService: { transition: mocks.transition },
}));

const session = {
    user: { id: 'admin-a', role: 'admin', name: 'Admin', email: 'admin@example.com' },
    expires: '2026-07-25T00:00:00.000Z',
};
const auditContext = { ipAddress: null, userAgent: 'vitest' };
const success = {
    changedCount: 1,
    skippedCount: 0,
    course: { id: 'course-a', slug: 'course-a', title: 'Course A', status: 'archived' },
};
const routeParams = { params: Promise.resolve({ id: 'course-a' }) };

describe('Admin course lifecycle API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.requireAdmin.mockResolvedValue({ session });
        mocks.getAuditContext.mockResolvedValue(auditContext);
        mocks.transition.mockResolvedValue(success);
        mocks.dbLimit.mockResolvedValue([]);
        mocks.dbWhere.mockResolvedValue(undefined);
        mocks.dbSet.mockReturnValue({ where: mocks.dbWhere });
        mocks.dbUpdate.mockReturnValue({ set: mocks.dbSet });
    });

    it('routes a validated lifecycle PATCH through the service', async () => {
        const route = await import('@/app/api/admin/courses/[id]/route');
        const response = await route.PATCH(new Request(
            'http://localhost/api/admin/courses/course-a',
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'archive', expectedStatus: 'published' }),
            },
        ), routeParams);

        expect(response.status).toBe(200);
        expect(mocks.transition).toHaveBeenCalledWith({
            actorId: 'admin-a',
            courseId: 'course-a',
            action: 'archive',
            expectedStatus: 'published',
            auditContext,
        });
        expect(await response.json()).toMatchObject(success);
        expect(mocks.revalidatePath.mock.calls).toEqual([
            ['/'],
            ['/courses'],
            ['/courses/course-a'],
            ['/sitemap.xml'],
        ]);
    });

    it('rejects malformed and invalid transition payloads before the service', async () => {
        const route = await import('@/app/api/admin/courses/[id]/route');
        const malformed = await route.PATCH(new Request(
            'http://localhost/api/admin/courses/course-a',
            { method: 'PATCH', body: '{' },
        ), routeParams);
        const invalid = await route.PATCH(new Request(
            'http://localhost/api/admin/courses/course-a',
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'publish', expectedStatus: 'published' }),
            },
        ), routeParams);

        expect(malformed.status).toBe(400);
        expect(invalid.status).toBe(400);
        expect(mocks.transition).not.toHaveBeenCalled();
    });

    it('maps published bundle dependencies to a conflict with safe details', async () => {
        const { CourseLifecycleError } = await import('@/lib/course-lifecycle');
        mocks.transition.mockRejectedValue(new CourseLifecycleError(
            'PUBLISHED_BUNDLE_DEPENDENCY',
            409,
            [{ id: 'bundle-a', title: 'Bundle A' }],
        ));
        const route = await import('@/app/api/admin/courses/[id]/route');
        const response = await route.PATCH(new Request(
            'http://localhost/api/admin/courses/course-a',
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'archive', expectedStatus: 'published' }),
            },
        ), routeParams);

        expect(response.status).toBe(409);
        expect(await response.json()).toMatchObject({
            code: 'PUBLISHED_BUNDLE_DEPENDENCY',
            blockingBundles: [{ id: 'bundle-a', title: 'Bundle A' }],
        });
    });

    it('maps legacy DELETE to archive and never calls database delete', async () => {
        const route = await import('@/app/api/admin/courses/[id]/route');
        const response = await route.DELETE(new Request(
            'http://localhost/api/admin/courses/course-a',
            { method: 'DELETE' },
        ), routeParams);

        expect(response.status).toBe(200);
        expect(mocks.transition).toHaveBeenCalledWith({
            actorId: 'admin-a',
            courseId: 'course-a',
            action: 'archive',
            auditContext,
        });
        expect(mocks.dbDelete).not.toHaveBeenCalled();
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/courses/course-a');
    });

    it('rejects status on general PUT so lifecycle cannot be bypassed', async () => {
        const route = await import('@/app/api/admin/courses/[id]/route');
        const response = await route.PUT(new Request(
            'http://localhost/api/admin/courses/course-a',
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'Changed', status: 'archived' }),
            },
        ), routeParams);

        expect(response.status).toBe(400);
        expect(mocks.dbUpdate).not.toHaveBeenCalled();
        expect(mocks.transition).not.toHaveBeenCalled();
    });

    it('still updates ordinary course details without writing lifecycle status', async () => {
        mocks.dbLimit.mockResolvedValueOnce([{
            id: 'course-a',
            title: 'Course A',
            slug: 'course-a',
            description: null,
            price: '1000.00',
            status: 'published',
            thumbnailUrl: null,
            certificateColor: 'blue',
            certificateHeaderImage: null,
            previewVideoUrl: null,
            promoPrice: null,
            promoStartsAt: null,
            promoEndsAt: null,
        }]);
        const route = await import('@/app/api/admin/courses/[id]/route');
        const response = await route.PUT(new Request(
            'http://localhost/api/admin/courses/course-a',
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'Changed title', price: 1200 }),
            },
        ), routeParams);

        expect(response.status).toBe(200);
        expect(mocks.dbSet).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Changed title',
            price: '1200',
        }));
        expect(mocks.dbSet.mock.calls[0][0]).not.toHaveProperty('status');
    });

    it('preserves the shared Admin authorization response', async () => {
        const { NextResponse } = await import('next/server');
        mocks.requireAdmin.mockResolvedValue(
            NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
        );
        const route = await import('@/app/api/admin/courses/[id]/route');
        const response = await route.DELETE(new Request(
            'http://localhost/api/admin/courses/course-a',
            { method: 'DELETE' },
        ), routeParams);

        expect(response.status).toBe(403);
        expect(mocks.transition).not.toHaveBeenCalled();
    });
});

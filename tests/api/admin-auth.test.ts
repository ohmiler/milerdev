import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auth } from '@/lib/auth';

// Mock auth module
vi.mock('@/lib/auth', () => ({
    auth: vi.fn(),
}));

// Mock DB
vi.mock('@/lib/db', () => ({
    db: {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        query: {
            courses: { findMany: vi.fn(), findFirst: vi.fn() },
            enrollments: { findMany: vi.fn(), findFirst: vi.fn() },
            payments: { findMany: vi.fn(), findFirst: vi.fn() },
        },
        transaction: vi.fn(async (fn: (tx: Record<string, unknown>) => unknown) => fn({
            insert: vi.fn().mockReturnThis(),
            values: vi.fn().mockResolvedValue(undefined),
            update: vi.fn().mockReturnThis(),
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue(undefined),
        })),
    },
}));

// Mock auditLog
vi.mock('@/lib/auditLog', () => ({
    logAudit: vi.fn(),
}));

// Mock email
vi.mock('@/lib/email', () => ({
    sendEnrollmentEmail: vi.fn().mockResolvedValue(undefined),
    sendPaymentConfirmation: vi.fn().mockResolvedValue(undefined),
    sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock coupon
vi.mock('@/lib/coupon', () => ({
    calculateDiscount: vi.fn().mockReturnValue(0),
}));

const mockedAuth = vi.mocked(auth);

/**
 * Helper: import a route module and call its handler
 */
async function callRoute(
    routePath: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: Record<string, unknown>,
) {
    const mod = await import(routePath);
    const handler = mod[method];
    if (!handler) throw new Error(`No ${method} handler in ${routePath}`);

    const url = 'http://localhost:3000/api/admin/test';
    const request = new Request(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });

    // For routes that need params
    const params = Promise.resolve({ id: 'test-id', lessonId: 'test-lesson-id' });

    return handler(request, { params });
}

// List of admin route modules to test
const adminRoutes: Array<{
    path: string;
    methods: Array<'GET' | 'POST' | 'PUT' | 'DELETE'>;
    body?: Record<string, unknown>;
}> = [
    { path: '@/app/api/admin/courses/route', methods: ['GET'] },
    { path: '@/app/api/admin/users/[id]/route', methods: ['GET', 'PUT', 'DELETE'] },
    { path: '@/app/api/admin/tags/route', methods: ['GET'] },
    { path: '@/app/api/admin/tags/[id]/route', methods: ['PUT', 'DELETE'] },
    { path: '@/app/api/admin/reviews/[id]/route', methods: ['PUT', 'DELETE'] },
    { path: '@/app/api/admin/announcements/route', methods: ['GET'] },
];

describe('Admin API Access Control', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Unauthenticated requests', () => {
        beforeEach(() => {
            mockedAuth.mockResolvedValue(null as never);
        });

        for (const route of adminRoutes) {
            for (const method of route.methods) {
                it(`${method} ${route.path} should return 401 for unauthenticated`, async () => {
                    const response = await callRoute(route.path, method, route.body);
                    expect(response.status).toBe(401);
                    const data = await response.json();
                    expect(data.error).toBeTruthy();
                });
            }
        }
    });

    describe('Non-admin (student) requests', () => {
        beforeEach(() => {
            mockedAuth.mockResolvedValue({
                user: { id: 'student-1', role: 'student', name: 'Student', email: 'student@test.com' },
                expires: new Date(Date.now() + 86400000).toISOString(),
            } as never);
        });

        for (const route of adminRoutes) {
            for (const method of route.methods) {
                it(`${method} ${route.path} should return 403 for non-admin`, async () => {
                    const response = await callRoute(route.path, method, route.body);
                    expect(response.status).toBe(403);
                });
            }
        }
    });

    describe('Admin requests should be allowed', () => {
        beforeEach(() => {
            mockedAuth.mockResolvedValue({
                user: { id: 'admin-1', role: 'admin', name: 'Admin', email: 'admin@test.com' },
                expires: new Date(Date.now() + 86400000).toISOString(),
            } as never);
        });

        it('GET admin/courses should not return 401', async () => {
            const response = await callRoute('@/app/api/admin/courses/route', 'GET');
            expect(response.status).not.toBe(401);
        });

        it('GET admin/tags should not return 401', async () => {
            const response = await callRoute('@/app/api/admin/tags/route', 'GET');
            expect(response.status).not.toBe(401);
        });

        it('GET admin/announcements should not return 401', async () => {
            const response = await callRoute('@/app/api/admin/announcements/route', 'GET');
            expect(response.status).not.toBe(401);
        });
    });
});

describe('User API Access Control', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Profile endpoint', () => {
        it('should return 401 for unauthenticated GET /api/profile', async () => {
            mockedAuth.mockResolvedValue(null as never);
            const mod = await import('@/app/api/profile/route');
            const response = await mod.GET();
            expect(response.status).toBe(401);
        });

        it('should return 401 for unauthenticated PUT /api/profile', async () => {
            mockedAuth.mockResolvedValue(null as never);
            const mod = await import('@/app/api/profile/route');
            const request = new Request('http://localhost:3000/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Hacker' }),
            });
            const response = await mod.PUT(request);
            expect(response.status).toBe(401);
        });
    });

    describe('Progress endpoint', () => {
        it('should return 401 for unauthenticated POST /api/progress', async () => {
            mockedAuth.mockResolvedValue(null as never);
            const mod = await import('@/app/api/progress/route');
            const request = new Request('http://localhost:3000/api/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lessonId: 'lesson-1', completed: true }),
            });
            const response = await mod.POST(request);
            expect(response.status).toBe(401);
        });
    });
});

describe('Self-protection rules', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedAuth.mockResolvedValue({
            user: { id: 'admin-1', role: 'admin', name: 'Admin', email: 'admin@test.com' },
            expires: new Date(Date.now() + 86400000).toISOString(),
        } as never);
    });

    it('admin should not be able to delete themselves', async () => {
        // Override params to match admin's own ID
        const mod = await import('@/app/api/admin/users/[id]/route');
        const request = new Request('http://localhost:3000/api/admin/users/admin-1', {
            method: 'DELETE',
        });
        const params = Promise.resolve({ id: 'admin-1' });
        const response = await mod.DELETE(request, { params });
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toContain('ตัวเอง');
    });

    it('admin should not be able to demote themselves', async () => {
        const { db } = await import('@/lib/db');
        // Mock finding the existing user
        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([{ id: 'admin-1', role: 'admin', email: 'admin@test.com' }]),
                }),
            }),
        } as never);

        const mod = await import('@/app/api/admin/users/[id]/route');
        const request = new Request('http://localhost:3000/api/admin/users/admin-1', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'student' }),
        });
        const params = Promise.resolve({ id: 'admin-1' });
        const response = await mod.PUT(request, { params });
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toContain('ตัวเอง');
    });
});

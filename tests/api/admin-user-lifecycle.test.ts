import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    requireAdmin: vi.fn(),
    setLifecycle: vi.fn(),
    updateRoles: vi.fn(),
    updateUser: vi.fn(),
    getAuditContext: vi.fn(),
}));

vi.mock('@/lib/auth-helpers', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/db', () => ({ db: {} }));
vi.mock('@/lib/auditLog', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/auditLog')>()),
    getAuditContext: mocks.getAuditContext,
}));
vi.mock('@/lib/user-lifecycle', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/user-lifecycle')>()),
    userLifecycleService: {
        setLifecycle: mocks.setLifecycle,
        updateRoles: mocks.updateRoles,
        updateUser: mocks.updateUser,
    },
}));

const session = {
    user: { id: 'admin-a', role: 'admin', name: 'Admin', email: 'admin@example.com' },
    expires: '2026-07-25T00:00:00.000Z',
};
const auditContext = { ipAddress: null, userAgent: 'vitest' };
const success = {
    requestedCount: 1,
    matchedCount: 1,
    changedCount: 1,
    skippedCount: 0,
    users: [{
        id: 'student-a',
        name: 'Student',
        role: 'student',
        lifecycleStatus: 'inactive',
        deactivatedAt: new Date('2026-07-24T00:00:00.000Z'),
    }],
};

describe('Admin user lifecycle API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.requireAdmin.mockResolvedValue({ session });
        mocks.getAuditContext.mockResolvedValue(auditContext);
        mocks.setLifecycle.mockResolvedValue(success);
        mocks.updateRoles.mockResolvedValue(success);
        mocks.updateUser.mockResolvedValue(success);
    });

    it('maps legacy single DELETE to an idempotent deactivation', async () => {
        const route = await import('@/app/api/admin/users/[id]/route');
        const response = await route.DELETE(
            new Request('http://localhost/api/admin/users/student-a', { method: 'DELETE' }),
            { params: Promise.resolve({ id: 'student-a' }) },
        );

        expect(response.status).toBe(200);
        expect(mocks.setLifecycle).toHaveBeenCalledWith({
            actorId: 'admin-a',
            targetIds: ['student-a'],
            action: 'deactivate',
            auditContext,
        });
        const data = await response.json();
        expect(data).toMatchObject({
            ...success,
            users: [expect.objectContaining({
                ...success.users[0],
                deactivatedAt: '2026-07-24T00:00:00.000Z',
            })],
        });
        expect(data.users).toEqual([
            expect.objectContaining({ id: 'student-a', lifecycleStatus: 'inactive' }),
        ]);
    });

    it('supports explicit single reactivation and routes updates through the service', async () => {
        const route = await import('@/app/api/admin/users/[id]/route');
        const reactivateResponse = await route.PATCH(
            new Request('http://localhost/api/admin/users/student-a', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reactivate' }),
            }),
            { params: Promise.resolve({ id: 'student-a' }) },
        );
        const updateResponse = await route.PUT(
            new Request('http://localhost/api/admin/users/student-a', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Updated', role: 'instructor' }),
            }),
            { params: Promise.resolve({ id: 'student-a' }) },
        );

        expect(reactivateResponse.status).toBe(200);
        expect(mocks.setLifecycle).toHaveBeenCalledWith(expect.objectContaining({
            targetIds: ['student-a'],
            action: 'reactivate',
        }));
        expect(updateResponse.status).toBe(200);
        expect(mocks.updateUser).toHaveBeenCalledWith(expect.objectContaining({
            targetId: 'student-a',
            name: 'Updated',
            role: 'instructor',
        }));
    });

    it('maps bulk legacy delete to deactivation and reports actual service counts', async () => {
        mocks.setLifecycle.mockResolvedValue({
            requestedCount: 2,
            matchedCount: 2,
            changedCount: 1,
            skippedCount: 1,
            users: [
                { ...success.users[0], id: 'student-a' },
                { ...success.users[0], id: 'student-b' },
            ],
        });
        const route = await import('@/app/api/admin/users/bulk/route');
        const response = await route.POST(new Request('http://localhost/api/admin/users/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', userIds: ['student-a', 'student-b'] }),
        }));

        expect(mocks.setLifecycle).toHaveBeenCalledWith(expect.objectContaining({
            targetIds: ['student-a', 'student-b'],
            action: 'deactivate',
        }));
        expect(await response.json()).toMatchObject({
            changedCount: 1,
            skippedCount: 1,
            users: [
                expect.objectContaining({ id: 'student-a', lifecycleStatus: 'inactive' }),
                expect.objectContaining({ id: 'student-b', lifecycleStatus: 'inactive' }),
            ],
        });
    });

    it('routes validated bulk role changes through the same authority boundary', async () => {
        const route = await import('@/app/api/admin/users/bulk/route');
        const response = await route.POST(new Request('http://localhost/api/admin/users/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'updateRole',
                userIds: ['student-a'],
                data: { role: 'instructor' },
            }),
        }));

        expect(response.status).toBe(200);
        expect(mocks.updateRoles).toHaveBeenCalledWith(expect.objectContaining({
            targetIds: ['student-a'],
            role: 'instructor',
        }));
    });

    it('returns a conflict code when the last-active-admin invariant blocks a request', async () => {
        const { UserLifecycleError } = await import('@/lib/user-lifecycle');
        mocks.setLifecycle.mockRejectedValue(
            new UserLifecycleError('LAST_ACTIVE_ADMIN', 409),
        );
        const route = await import('@/app/api/admin/users/[id]/route');
        const response = await route.DELETE(
            new Request('http://localhost/api/admin/users/admin-b', { method: 'DELETE' }),
            { params: Promise.resolve({ id: 'admin-b' }) },
        );

        expect(response.status).toBe(409);
        expect(await response.json()).toMatchObject({ code: 'LAST_ACTIVE_ADMIN' });
    });

    it('rejects duplicate bulk IDs before the service boundary', async () => {
        const route = await import('@/app/api/admin/users/bulk/route');
        const response = await route.POST(new Request('http://localhost/api/admin/users/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'deactivate', userIds: ['student-a', 'student-a'] }),
        }));

        expect(response.status).toBe(400);
        expect(mocks.setLifecycle).not.toHaveBeenCalled();
    });
});

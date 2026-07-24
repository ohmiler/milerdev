import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    requireAdmin: vi.fn(),
    hash: vi.fn(),
    logAudit: vi.fn(),
    updateSet: null as Record<string, unknown> | null,
}));

vi.mock('@/lib/auth-helpers', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('bcryptjs', () => ({
    default: { hash: mocks.hash },
}));
vi.mock('@/lib/auditLog', () => ({ logAudit: mocks.logAudit }));
vi.mock('@/lib/error-handler', () => ({ logError: vi.fn() }));
vi.mock('@/lib/db', () => ({
    db: {
        select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([{
                        id: 'student-a',
                        email: 'student@example.test',
                        deactivatedAt: new Date('2026-07-24T00:00:00.000Z'),
                    }]),
                }),
            }),
        }),
        update: vi.fn().mockReturnValue({
            set: vi.fn().mockImplementation((values: Record<string, unknown>) => {
                mocks.updateSet = values;
                return {
                    where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
                };
            }),
        }),
    },
}));

describe('Admin user password reset lifecycle contract', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.updateSet = null;
        mocks.requireAdmin.mockResolvedValue({
            session: {
                user: { id: 'admin-a', role: 'admin' },
                expires: '2026-07-25T00:00:00.000Z',
            },
        });
        mocks.hash.mockResolvedValue('hashed-password');
    });

    it('revokes prior sessions without reactivating an inactive target or auditing PII', async () => {
        const route = await import('@/app/api/admin/users/[id]/reset-password/route');
        const response = await route.POST(
            new Request('http://localhost/api/admin/users/student-a/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword: 'NewPassword1' }),
            }),
            { params: Promise.resolve({ id: 'student-a' }) },
        );

        expect(response.status).toBe(200);
        expect(mocks.updateSet).toMatchObject({
            passwordHash: 'hashed-password',
            resetToken: null,
            resetExpires: null,
        });
        expect(mocks.updateSet).toHaveProperty('sessionVersion');
        expect(mocks.updateSet).not.toHaveProperty('deactivatedAt');
        expect(mocks.logAudit).toHaveBeenCalledWith(expect.objectContaining({
            entityId: 'student-a',
            newValue: expect.not.stringContaining('student@example.test'),
        }));
    });
});

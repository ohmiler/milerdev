import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Admin certificate record changes: revoke, restore, and delete (/api/admin/certificates/[id]),
 * plus input validation before manual issuance (/api/admin/certificates). Issuance itself is
 * covered on real MySQL in tests/integration/admin-grants.mysql.ts.
 */

const mocks = vi.hoisted(() => ({
    requireAdmin: vi.fn(),
    logAudit: vi.fn(),
    issueCertificate: vi.fn(),
    found: [] as unknown[],
    updates: [] as Array<Record<string, unknown>>,
    deletes: 0,
}));

vi.mock('@/lib/auth/helpers', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/auditLog', () => ({ logAudit: mocks.logAudit }));
vi.mock('@/lib/error-handler', () => ({ logError: vi.fn() }));
vi.mock('@/lib/certificates/issuance', () => ({ issueCertificate: mocks.issueCertificate }));
vi.mock('@/lib/db', () => ({
    db: {
        select: () => ({ from: () => ({ where: () => ({ limit: async () => mocks.found }) }) }),
        update: () => ({
            set: (values: Record<string, unknown>) => ({
                where: async () => { mocks.updates.push(values); },
            }),
        }),
        delete: () => ({ where: async () => { mocks.deletes++; } }),
    },
}));

import { POST } from '@/app/api/admin/certificates/route';
import { DELETE, PUT } from '@/app/api/admin/certificates/[id]/route';

const params = { params: Promise.resolve({ id: 'cert-1' }) };
const put = (body: unknown) => PUT(new Request('http://localhost/api/admin/certificates/cert-1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
}), params);

describe('admin certificate records', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.found = [{ id: 'cert-1', revokedAt: null }];
        mocks.updates = [];
        mocks.deletes = 0;
        mocks.requireAdmin.mockResolvedValue({ session: { user: { id: 'admin-a', role: 'admin' } } });
    });

    it('revokes with a reason and audits who did it', async () => {
        const res = await put({ action: 'revoke', reason: 'duplicate account' });

        expect(res.status).toBe(200);
        expect(mocks.updates).toEqual([{ revokedAt: expect.any(Date), revokedReason: 'duplicate account' }]);
        expect(mocks.logAudit).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'admin-a', action: 'update', entityType: 'certificate', entityId: 'cert-1',
        }));
    });

    it('restores by clearing the revocation', async () => {
        const res = await put({ action: 'restore' });

        expect(res.status).toBe(200);
        expect(mocks.updates).toEqual([{ revokedAt: null, revokedReason: null }]);
        expect(mocks.logAudit).toHaveBeenCalledWith(expect.objectContaining({ newValue: 'restored' }));
    });

    it('changes nothing for an unknown action or an unknown certificate', async () => {
        expect((await put({ action: 'reissue' })).status).toBe(400);
        mocks.found = [];
        expect((await put({ action: 'revoke' })).status).toBe(404);

        expect(mocks.updates).toEqual([]);
        expect(mocks.logAudit).not.toHaveBeenCalled();
    });

    it('hard-deletes and audits without checking the certificate exists (KNOWN BEHAVIOR)', async () => {
        mocks.found = [];

        const res = await DELETE(new Request('http://localhost/api/admin/certificates/cert-1', { method: 'DELETE' }), params);

        expect(res.status).toBe(200);
        expect(mocks.deletes).toBe(1);
        expect(mocks.logAudit).toHaveBeenCalledWith(expect.objectContaining({
            action: 'delete', entityType: 'certificate', entityId: 'cert-1',
        }));
    });

    it('requires a learner and a course before issuing', async () => {
        for (const body of [{}, { userId: 'user-a' }, { courseId: 'course-a' }]) {
            const res = await POST(new Request('http://localhost/api/admin/certificates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            }));
            expect(res.status).toBe(400);
        }
        expect(mocks.issueCertificate).not.toHaveBeenCalled();
    });
});

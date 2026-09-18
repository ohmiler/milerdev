import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), change: vi.fn(), grant: vi.fn() }));
vi.mock('@/lib/auth-helpers', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/auditLog', () => ({ getAuditContext: async () => ({ ipAddress: null, userAgent: null }), logAudit: vi.fn() }));
vi.mock('@/lib/admin-enrollment', async (original) => ({
  ...await original<typeof import('@/lib/admin-enrollment')>(),
  changeAdminEnrollmentAccess: mocks.change,
  grantAdminEnrollment: mocks.grant,
}));
import { DELETE, PATCH } from '@/app/api/admin/enrollments/[id]/route';
import { POST as grant } from '@/app/api/admin/enrollments/route';
import { POST as memberGrant } from '@/app/api/admin/users/[id]/enrollments/route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ session: { user: { id: 'admin' } } });
  mocks.change.mockResolvedValue({ kind: 'revoked', enrollmentId: 'enrollment-a' });
  mocks.grant.mockResolvedValue({ kind: 'restored', enrollmentId: 'enrollment-a' });
});
const params = { params: Promise.resolve({ id: 'enrollment-a' }) };
const request = (body: unknown, method = 'DELETE') => new Request('http://localhost/api/admin/enrollments/enrollment-a', {
  method, body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
});

describe('admin enrollment authority', () => {
  it.each([DELETE, PATCH])('rejects unauthorized changes before invoking the module', async (handler) => {
    mocks.requireAdmin.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    expect((await handler(request({ reason: 'test request' }), params)).status).toBe(403);
    expect(mocks.change).not.toHaveBeenCalled();
  });
  it.each([{}, { reason: ' ' }, { reason: 'x'.repeat(501) }])('requires a bounded reason: %j', async (body) => {
    expect((await DELETE(request(body), params)).status).toBe(400);
    expect(mocks.change).not.toHaveBeenCalled();
  });
  it('uses the server actor and route identity, preserving the reason', async () => {
    expect((await DELETE(request({ reason: ' explicit request ', actorId: 'forged', enrollmentId: 'forged' }), params)).status).toBe(200);
    expect(mocks.change).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'admin', enrollmentId: 'enrollment-a', action: 'revoke', reason: 'explicit request' }));
  });
  it('restores only through an explicit authenticated action and reports failures', async () => {
    await PATCH(request({ reason: 'approved again' }, 'PATCH'), params);
    expect(mocks.change).toHaveBeenCalledWith(expect.objectContaining({ action: 'restore' }));
    mocks.change.mockResolvedValueOnce({ kind: 'not_found' });
    expect((await DELETE(request({ reason: 'test request' }), params)).status).toBe(404);
    mocks.change.mockRejectedValueOnce(new Error('storage unavailable'));
    expect((await DELETE(request({ reason: 'test request' }), params)).status).toBe(500);
  });
  it('both manual grant callers use the same restoration rules', async () => {
    expect((await grant(request({ userId: 'member', courseId: 'course-a' }, 'POST'))).status).toBe(201);
    expect((await memberGrant(request({ courseId: 'course-a' }, 'POST'), { params: Promise.resolve({ id: 'member' }) })).status).toBe(200);
    expect(mocks.grant).toHaveBeenNthCalledWith(1, expect.objectContaining({ actorId: 'admin', userId: 'member', courseId: 'course-a' }));
    expect(mocks.grant).toHaveBeenNthCalledWith(2, expect.objectContaining({ actorId: 'admin', userId: 'member', courseId: 'course-a' }));
  });
});

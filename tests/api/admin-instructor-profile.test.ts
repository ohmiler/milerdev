import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  logAudit: vi.fn(),
  dbLimit: vi.fn(),
  dbUpdate: vi.fn(),
  dbSet: vi.fn(),
  dbWhere: vi.fn(),
}));

vi.mock('@/lib/auth/helpers', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/auditLog', () => ({ logAudit: mocks.logAudit }));
vi.mock('@/lib/error-handler', () => ({ logError: vi.fn() }));
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: mocks.dbLimit,
    update: mocks.dbUpdate,
  },
}));

import { PUT } from '@/app/api/admin/users/[id]/instructor-profile/route';

const session = { user: { id: 'admin-a', role: 'admin' }, expires: '2099-01-01T00:00:00.000Z' };
const routeParams = { params: Promise.resolve({ id: 'user-teacher' }) };
const profile = {
  headline: 'ผู้ก่อตั้งและผู้สอน MilerDev',
  bio: 'สอนเขียนโปรแกรมภาษาไทยผ่านช่อง YouTube',
  profileLinks: [{ label: 'ช่อง YouTube', url: 'https://www.youtube.com/@MilerDev' }],
};

function put(body: unknown) {
  return PUT(new Request('http://localhost/api/admin/users/user-teacher/instructor-profile', {
    method: 'PUT',
    body: JSON.stringify(body),
  }), routeParams);
}

describe('Admin instructor profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ session });
    mocks.dbWhere.mockResolvedValue(undefined);
    mocks.dbSet.mockReturnValue({ where: mocks.dbWhere });
    mocks.dbUpdate.mockReturnValue({ set: mocks.dbSet });
  });

  it('saves the card fields for an instructor and audits the change', async () => {
    mocks.dbLimit.mockResolvedValueOnce([{ role: 'instructor' }]);

    const response = await put(profile);

    expect(response.status).toBe(200);
    expect(mocks.dbSet).toHaveBeenCalledWith(expect.objectContaining(profile));
    // Only the profile: role, name and session state stay with the user lifecycle authority.
    expect(Object.keys(mocks.dbSet.mock.calls[0][0]).sort()).toEqual(['bio', 'headline', 'profileLinks', 'updatedAt']);
    expect(mocks.logAudit).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'instructor_profile', entityId: 'user-teacher' }));
  });

  it('stores blanks as null so the card leaves them out', async () => {
    mocks.dbLimit.mockResolvedValueOnce([{ role: 'admin' }]);

    await put({ headline: '  ', bio: null, profileLinks: [] });

    expect(mocks.dbSet).toHaveBeenCalledWith(expect.objectContaining({ headline: null, bio: null, profileLinks: null }));
  });

  it('refuses a learner account', async () => {
    mocks.dbLimit.mockResolvedValueOnce([{ role: 'student' }]);

    const response = await put(profile);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'NOT_INSTRUCTOR' });
    expect(mocks.dbUpdate).not.toHaveBeenCalled();
  });

  it.each([
    ['an http link', [{ label: 'Site', url: 'http://example.com' }]],
    ['a script link', [{ label: 'Site', url: 'javascript:alert(1)' }]],
    ['more than four links', Array.from({ length: 5 }, (_, index) => ({ label: `L${index}`, url: 'https://example.com' }))],
  ])('rejects %s, since the links open from a public page', async (_label, profileLinks) => {
    const response = await put({ ...profile, profileLinks });

    expect(response.status).toBe(400);
    expect(mocks.dbLimit).not.toHaveBeenCalled();
    expect(mocks.dbUpdate).not.toHaveBeenCalled();
  });
});

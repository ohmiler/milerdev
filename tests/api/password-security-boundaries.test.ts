import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PasswordSecurityError } from '@/lib/password-errors';
const mocks = vi.hoisted(() => ({
  select: vi.fn(), update: vi.fn(), insert: vi.fn(), transaction: vi.fn(),
  screen: vi.fn(), hash: vi.fn(), compare: vi.fn(), admin: vi.fn(), auth: vi.fn(),
}));
vi.mock('@/lib/password-screening', () => ({ assertPasswordNotCompromised: mocks.screen }));
vi.mock('argon2', () => ({ default: { argon2id: 2, hash: mocks.hash } }));
vi.mock('bcryptjs', () => ({ default: { compare: mocks.compare } }));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/auth-helpers', () => ({ requireAdmin: mocks.admin }));
vi.mock('@/lib/auditLog', () => ({ logAudit: vi.fn() }));
vi.mock('@/lib/email', () => ({ sendRegistrationVerificationEmail: vi.fn() }));
vi.mock('@/lib/auth-rate-limit', () => ({
  consumeAuthRateLimit: vi.fn().mockResolvedValue({ success: true }),
  authRateLimitUnavailableResponse: vi.fn(),
}));
vi.mock('@/lib/rate-limit', () => ({
  getClientIP: () => '127.0.0.1', rateLimits: { auth: {} }, rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/db', () => ({ db: {
  select: () => ({ from: () => ({ where: () => ({ limit: mocks.select }) }) }),
  update: mocks.update, insert: mocks.insert, transaction: mocks.transaction,
} }));
import { POST as register } from '@/app/api/auth/register/confirm/route';
import { POST as reset } from '@/app/api/auth/reset-password/confirm/route';
import { POST as change } from '@/app/api/auth/change-password/route';
import { POST as adminReset } from '@/app/api/admin/users/[id]/reset-password/route';
import { POST as importUsers } from '@/app/api/admin/users/import/route';

const request = (password: unknown) => new Request('http://localhost', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password, newPassword: password, currentPassword: 'legacy', name: 'Owner', token: 'a'.repeat(64) }),
});
const handlers = [
  ['register', register], ['reset', reset], ['change', change],
  ['admin reset', (req: Request) => adminReset(req, { params: Promise.resolve({ id: 'user' }) })],
] as const;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.screen.mockReset().mockResolvedValue(undefined);
  mocks.hash.mockResolvedValue('$argon2id$synthetic');
  mocks.select.mockResolvedValue([{ id: 'user', email: 'owner@example.test', returnTo: '/dashboard', passwordHash: '$2b$legacy', deactivatedAt: null }]);
  mocks.auth.mockResolvedValue({ user: { id: 'user' } });
  mocks.admin.mockResolvedValue({ session: { user: { id: 'admin' } } });
  mocks.compare.mockReset().mockResolvedValueOnce(true).mockResolvedValue(false);
});
describe.each(handlers)('%s password boundary', (_name, handler) => {
  it.each(['compromised', 'screening_unavailable'] as const)('leaves credentials, reset/registration tokens and sessions untouched on %s', async (kind) => {
    mocks.screen.mockRejectedValue(new PasswordSecurityError(kind, 'Safe explanation'));
    const response = await handler(request('a valid long passphrase'));
    expect(response.status).toBe(kind === 'compromised' ? 400 : 503);
    expect((await response.json()).error).toBe('Safe explanation');
    expect(mocks.hash).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it.each(['short', 'a'.repeat(129), 12345, null])('rejects invalid new credentials before hashing or screening', async (password) => {
    expect((await handler(request(password))).status).toBe(400);
    expect(mocks.screen).not.toHaveBeenCalled();
    expect(mocks.hash).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
describe('CSV import password boundary', () => {
  const csvRequest = (password: string) => {
    const form = new FormData();
    const escaped = password.replaceAll('"', '""');
    form.set('file', new File([`email,password\r\nowner@example.test,"${escaped}"`], 'users.csv', { type: 'text/csv' }));
    return new Request('http://localhost', { method: 'POST', body: form });
  };
  it.each(['compromised', 'screening_unavailable'] as const)('records a failed row without writing on %s', async (kind) => {
    mocks.select.mockResolvedValue([]);
    mocks.screen.mockRejectedValue(new PasswordSecurityError(kind, 'Safe explanation'));
    const response = await importUsers(csvRequest('a valid long passphrase'));
    expect((await response.json()).results).toMatchObject({ failed: 1, success: 0 });
    expect(mocks.hash).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it('passes quoted password content to screening and hashing without trimming or dropping characters', async () => {
    mocks.select.mockResolvedValue([]);
    mocks.insert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
    const password = '  a long,"quoted" passphrase  ';
    const response = await importUsers(csvRequest(password));
    expect((await response.json()).results).toMatchObject({ success: 1, failed: 0 });
    expect(mocks.screen).toHaveBeenCalledWith(password);
    expect(mocks.hash).toHaveBeenCalledWith(password, expect.any(Object));
  });
  it('rejects supplied weak passwords without writing', async () => {
    mocks.select.mockResolvedValue([]);
    const response = await importUsers(csvRequest('short'));
    expect((await response.json()).results.failed).toBe(1);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.screen).not.toHaveBeenCalled();
  });
});

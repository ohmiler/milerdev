import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emailRegistrations, users } from '@/lib/db/schema';
const mocks = vi.hoisted(() => ({
    select: vi.fn(), insert: vi.fn(), remove: vi.fn(), values: vi.fn(), transaction: vi.fn(),
    claim: vi.fn(), txInsert: vi.fn(), txValues: vi.fn(), send: vi.fn(), hash: vi.fn(),
}));
vi.mock('@/lib/email', () => ({ sendRegistrationVerificationEmail: mocks.send }));
vi.mock('@/lib/password-storage', () => ({ hashNewPassword: mocks.hash }));
vi.mock('@/lib/db', () => ({ db: {
    select: () => ({ from: () => ({ where: () => ({ limit: mocks.select }) }) }),
    insert: mocks.insert, delete: mocks.remove, transaction: mocks.transaction,
} }));
import { completeEmailRegistration, hashRegistrationToken, requestEmailRegistration } from '@/lib/email-registration';

beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockResolvedValue([]);
    mocks.insert.mockReturnValue({ values: mocks.values }); mocks.values.mockResolvedValue(undefined);
    mocks.remove.mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) });
    mocks.send.mockResolvedValue(true); mocks.hash.mockResolvedValue('owner-password-hash');
    mocks.claim.mockResolvedValue([{ affectedRows: 1 }]);
    mocks.txInsert.mockReturnValue({ values: mocks.txValues }); mocks.txValues.mockResolvedValue(undefined);
    mocks.transaction.mockImplementation((callback) => callback({
        delete: () => ({ where: mocks.claim }), insert: mocks.txInsert,
    }));
});
describe('registration ownership boundary', () => {
    it('stores only a token digest and never creates a user before verification', async () => {
        await requestEmailRegistration('owner@example.test', 'https://evil.test');
        const sent = mocks.send.mock.calls[0][0];
        const stored = mocks.values.mock.calls[0][0];
        expect(sent.token).toMatch(/^[a-f0-9]{64}$/);
        expect(stored.tokenHash).toBe(hashRegistrationToken(sent.token));
        expect(stored).not.toHaveProperty('passwordHash');
        expect(stored).not.toHaveProperty('token');
        expect(stored.returnTo).toBe('/dashboard');
        expect(stored.expiresAt.getTime() - Date.now()).toBeGreaterThan(29 * 60 * 1000);
        expect(mocks.insert).toHaveBeenCalledWith(emailRegistrations);
        expect(mocks.transaction).not.toHaveBeenCalled();
    });
    it.each(['password', 'google', 'inactive'])('leaves existing %s accounts untouched', async () => {
        mocks.select.mockResolvedValue([{ id: 'existing' }]);
        await requestEmailRegistration('owner@example.test', '/courses');
        expect(mocks.insert).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
    });
    it('removes only the newly issued digest when delivery fails', async () => {
        mocks.send.mockResolvedValue(false);
        await requestEmailRegistration('owner@example.test', '/courses');
        expect(mocks.remove).toHaveBeenCalledTimes(2);
        expect(mocks.insert).not.toHaveBeenCalledWith(users);
    });
    it('creates verified student credentials chosen by the token holder inside a transaction', async () => {
        mocks.select.mockResolvedValue([{ email: 'owner@example.test', returnTo: '/courses' }]);
        const result = await completeEmailRegistration('a'.repeat(64), 'Owner', 'OwnerPassphrase123!');
        expect(result).toEqual({ loginHref: '/login?callbackUrl=%2Fcourses' });
        expect(mocks.txInsert).toHaveBeenCalledWith(users);
        expect(mocks.txValues).toHaveBeenCalledWith(expect.objectContaining({
            email: 'owner@example.test', name: 'Owner', passwordHash: 'owner-password-hash', role: 'student', emailVerifiedAt: expect.any(Date),
        }));
        expect(mocks.hash).toHaveBeenCalledWith('OwnerPassphrase123!');
    });
    it('rejects absent or expired links before hashing a password', async () => {
        expect(await completeEmailRegistration('a'.repeat(64), 'Owner', 'OwnerPassphrase123!')).toBeNull();
        expect(mocks.hash).not.toHaveBeenCalled();
    });
    it('does not create an account when the atomic claim loses', async () => {
        mocks.select.mockResolvedValue([{ email: 'owner@example.test', returnTo: '/courses' }]);
        mocks.claim.mockResolvedValue([{ affectedRows: 0 }]);
        expect(await completeEmailRegistration('a'.repeat(64), 'Owner', 'OwnerPassphrase123!')).toBeNull();
        expect(mocks.txInsert).not.toHaveBeenCalled();
    });
    it('treats an email collision during commit as invalid, never updating that account', async () => {
        mocks.select.mockResolvedValue([{ email: 'owner@example.test', returnTo: '/courses' }]);
        mocks.txValues.mockRejectedValue({ cause: { code: 'ER_DUP_ENTRY' } });
        expect(await completeEmailRegistration('a'.repeat(64), 'Owner', 'OwnerPassphrase123!')).toBeNull();
    });
    it('propagates persistence failure so the route cannot report success', async () => {
        mocks.select.mockResolvedValue([{ email: 'owner@example.test', returnTo: '/courses' }]);
        mocks.txValues.mockRejectedValue(new Error('storage failed'));
        await expect(completeEmailRegistration('a'.repeat(64), 'Owner', 'OwnerPassphrase123!')).rejects.toThrow('storage failed');
    });
});

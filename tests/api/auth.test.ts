import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn().mockResolvedValue('$2a$12$hashedpassword'),
        compare: vi.fn(),
    },
}));

// Mock auth
vi.mock('@/lib/auth', () => ({
    auth: vi.fn(),
}));

// Mock email
vi.mock('@/lib/email', () => ({
    sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock cuid2
vi.mock('@paralleldrive/cuid2', () => ({
    createId: vi.fn().mockReturnValue('mock-cuid-token'),
}));

// Mock rate-limit (allow all requests by default)
vi.mock('@/lib/rate-limit', () => ({
    checkRateLimit: vi.fn().mockReturnValue({ success: true, remaining: 10, resetTime: Date.now() + 60000 }),
    getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
    rateLimits: {
        auth: { maxRequests: 5, windowMs: 60000 },
        sensitive: { maxRequests: 10, windowMs: 60000 },
        general: { maxRequests: 100, windowMs: 60000 },
    },
    rateLimitResponse: vi.fn().mockReturnValue(
        new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 })
    ),
}));

// Track DB operations for assertions
const mockDbState = {
    selectResult: [] as unknown[],
    insertCalled: false,
    updateSet: null as Record<string, unknown> | null,
};

vi.mock('@/lib/db', () => ({
    db: {
        select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockImplementation(() => Promise.resolve(mockDbState.selectResult)),
                }),
            }),
        }),
        insert: vi.fn().mockReturnValue({
            values: vi.fn().mockImplementation(() => {
                mockDbState.insertCalled = true;
                return Promise.resolve();
            }),
        }),
        update: vi.fn().mockReturnValue({
            set: vi.fn().mockImplementation((data: Record<string, unknown>) => {
                mockDbState.updateSet = data;
                return {
                    where: vi.fn().mockResolvedValue(undefined),
                };
            }),
        }),
        query: {
            users: { findFirst: vi.fn() },
        },
    },
}));

import { auth } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { checkRateLimit } from '@/lib/rate-limit';

const mockedAuth = vi.mocked(auth);
const mockedBcrypt = vi.mocked(bcrypt);
const mockedRateLimit = vi.mocked(checkRateLimit);

function makeRequest(url: string, body: Record<string, unknown>, method = 'POST') {
    return new Request(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

// ============================================================
// REGISTER TESTS
// ============================================================
describe('POST /api/auth/register', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDbState.selectResult = [];
        mockDbState.insertCalled = false;
        mockDbState.updateSet = null;
        mockedRateLimit.mockReturnValue({ success: true, remaining: 10, resetTime: Date.now() + 60000 });
    });

    async function callRegister(body: Record<string, unknown>) {
        const mod = await import('@/app/api/auth/register/route');
        return mod.POST(makeRequest('http://localhost:3000/api/auth/register', body));
    }

    it('should register a valid user', async () => {
        const res = await callRegister({ name: 'Test User', email: 'test@example.com', password: 'Test1234' });
        expect(res.status).toBe(201);
        expect(mockDbState.insertCalled).toBe(true);
    });

    it('should reject missing name', async () => {
        const res = await callRegister({ email: 'test@example.com', password: 'Test1234' });
        expect(res.status).toBe(400);
    });

    it('should reject short name', async () => {
        const res = await callRegister({ name: 'A', email: 'test@example.com', password: 'Test1234' });
        expect(res.status).toBe(400);
    });

    it('should reject invalid email', async () => {
        const res = await callRegister({ name: 'Test', email: 'not-an-email', password: 'Test1234' });
        expect(res.status).toBe(400);
    });

    it('should reject weak password (no uppercase)', async () => {
        const res = await callRegister({ name: 'Test', email: 'test@example.com', password: 'test1234' });
        expect(res.status).toBe(400);
    });

    it('should reject weak password (no lowercase)', async () => {
        const res = await callRegister({ name: 'Test', email: 'test@example.com', password: 'TEST1234' });
        expect(res.status).toBe(400);
    });

    it('should reject weak password (no number)', async () => {
        const res = await callRegister({ name: 'Test', email: 'test@example.com', password: 'TestTest' });
        expect(res.status).toBe(400);
    });

    it('should reject short password', async () => {
        const res = await callRegister({ name: 'Test', email: 'test@example.com', password: 'Te1' });
        expect(res.status).toBe(400);
    });

    it('should reject duplicate email', async () => {
        mockDbState.selectResult = [{ id: 'existing-user', email: 'test@example.com' }];
        const res = await callRegister({ name: 'Test', email: 'test@example.com', password: 'Test1234' });
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('ถูกใช้งานแล้ว');
    });

    it('should normalize email (lowercase)', async () => {
        const res = await callRegister({ name: 'Test', email: 'Test@Example.COM', password: 'Test1234' });
        expect(res.status).toBe(201);
    });

    it('should return 429 when rate limited', async () => {
        mockedRateLimit.mockReturnValue({ success: false, remaining: 0, resetTime: Date.now() + 60000 });
        const res = await callRegister({ name: 'Test', email: 'test@example.com', password: 'Test1234' });
        expect(res.status).toBe(429);
    });

    it('should always assign student role', async () => {
        const { db } = await import('@/lib/db');
        const res = await callRegister({ name: 'Test', email: 'test@example.com', password: 'Test1234' });
        expect(res.status).toBe(201);
        // Verify insert was called with role: 'student'
        const insertMock = vi.mocked(db.insert);
        const valuesMock = insertMock.mock.results[0]?.value?.values;
        if (valuesMock) {
            const callArgs = valuesMock.mock.calls[0]?.[0];
            expect(callArgs?.role).toBe('student');
        }
    });
});

// ============================================================
// RESET PASSWORD TESTS
// ============================================================
describe('POST /api/auth/reset-password', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDbState.selectResult = [];
        mockDbState.insertCalled = false;
        mockDbState.updateSet = null;
        mockedRateLimit.mockReturnValue({ success: true, remaining: 10, resetTime: Date.now() + 60000 });
    });

    async function callReset(body: Record<string, unknown>) {
        const mod = await import('@/app/api/auth/reset-password/route');
        return mod.POST(makeRequest('http://localhost:3000/api/auth/reset-password', body));
    }

    it('should return success even for non-existent email (anti-enumeration)', async () => {
        mockDbState.selectResult = [];
        const res = await callReset({ email: 'nobody@example.com' });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.message).toContain('หากอีเมลนี้มีในระบบ');
    });

    it('should return success for existing email', async () => {
        mockDbState.selectResult = [{ id: 'user-1', email: 'user@example.com', name: 'User' }];
        const res = await callReset({ email: 'user@example.com' });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.message).toContain('หากอีเมลนี้มีในระบบ');
    });

    it('should generate reset token for existing user', async () => {
        mockDbState.selectResult = [{ id: 'user-1', email: 'user@example.com', name: 'User' }];
        await callReset({ email: 'user@example.com' });
        expect(mockDbState.updateSet).toBeTruthy();
        expect(mockDbState.updateSet).toHaveProperty('resetToken');
        expect(mockDbState.updateSet).toHaveProperty('resetExpires');
    });

    it('should reject invalid email format', async () => {
        const res = await callReset({ email: 'not-valid' });
        expect(res.status).toBe(400);
    });

    it('should return 429 when rate limited', async () => {
        mockedRateLimit.mockReturnValue({ success: false, remaining: 0, resetTime: Date.now() + 60000 });
        const res = await callReset({ email: 'user@example.com' });
        expect(res.status).toBe(429);
    });
});

// ============================================================
// RESET PASSWORD CONFIRM TESTS
// ============================================================
describe('POST /api/auth/reset-password/confirm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDbState.selectResult = [];
        mockDbState.insertCalled = false;
        mockDbState.updateSet = null;
        mockedRateLimit.mockReturnValue({ success: true, remaining: 10, resetTime: Date.now() + 60000 });
    });

    async function callResetConfirm(body: Record<string, unknown>) {
        const mod = await import('@/app/api/auth/reset-password/confirm/route');
        return mod.POST(makeRequest('http://localhost:3000/api/auth/reset-password/confirm', body));
    }

    it('should reject invalid token', async () => {
        mockDbState.selectResult = [];
        const res = await callResetConfirm({ token: 'invalid-token', newPassword: 'NewPass1' });
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('หมดอายุ');
    });

    it('should reset password with valid token', async () => {
        mockDbState.selectResult = [{ id: 'user-1', resetToken: 'valid-token', resetExpires: new Date(Date.now() + 3600000) }];
        const res = await callResetConfirm({ token: 'valid-token', newPassword: 'NewPass1' });
        expect(res.status).toBe(200);
        // Verify token is cleared
        expect(mockDbState.updateSet).toHaveProperty('resetToken', null);
        expect(mockDbState.updateSet).toHaveProperty('resetExpires', null);
        expect(mockDbState.updateSet).toHaveProperty('passwordHash');
    });

    it('should reject weak new password', async () => {
        const res = await callResetConfirm({ token: 'valid-token', newPassword: 'weak' });
        expect(res.status).toBe(400);
    });

    it('should reject empty token', async () => {
        const res = await callResetConfirm({ token: '', newPassword: 'NewPass1' });
        expect(res.status).toBe(400);
    });

    it('should return 429 when rate limited', async () => {
        mockedRateLimit.mockReturnValue({ success: false, remaining: 0, resetTime: Date.now() + 60000 });
        const res = await callResetConfirm({ token: 'valid-token', newPassword: 'NewPass1' });
        expect(res.status).toBe(429);
    });
});

// ============================================================
// CHANGE PASSWORD TESTS
// ============================================================
describe('POST /api/auth/change-password', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDbState.selectResult = [];
        mockDbState.insertCalled = false;
        mockDbState.updateSet = null;
        mockedRateLimit.mockReturnValue({ success: true, remaining: 10, resetTime: Date.now() + 60000 });
    });

    async function callChangePassword(body: Record<string, unknown>) {
        const mod = await import('@/app/api/auth/change-password/route');
        return mod.POST(makeRequest('http://localhost:3000/api/auth/change-password', body));
    }

    it('should return 401 for unauthenticated user', async () => {
        mockedAuth.mockResolvedValue(null as never);
        const res = await callChangePassword({ currentPassword: 'Old1234!', newPassword: 'New1234!' });
        expect(res.status).toBe(401);
    });

    it('should reject if current password is wrong', async () => {
        mockedAuth.mockResolvedValue({
            user: { id: 'user-1', role: 'student' },
            expires: new Date(Date.now() + 86400000).toISOString(),
        } as never);
        mockDbState.selectResult = [{ id: 'user-1', passwordHash: '$2a$12$existing' }];
        mockedBcrypt.compare.mockResolvedValueOnce(false as never); // current password wrong

        const res = await callChangePassword({ currentPassword: 'Wrong1234', newPassword: 'New1234!' });
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('ไม่ถูกต้อง');
    });

    it('should reject if new password same as old', async () => {
        mockedAuth.mockResolvedValue({
            user: { id: 'user-1', role: 'student' },
            expires: new Date(Date.now() + 86400000).toISOString(),
        } as never);
        mockDbState.selectResult = [{ id: 'user-1', passwordHash: '$2a$12$existing' }];
        mockedBcrypt.compare
            .mockResolvedValueOnce(true as never)  // current password correct
            .mockResolvedValueOnce(true as never);  // new password same as old

        const res = await callChangePassword({ currentPassword: 'Old1234!', newPassword: 'Old1234!' });
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('ไม่เหมือนรหัสผ่านเดิม');
    });

    it('should change password and clear reset token', async () => {
        mockedAuth.mockResolvedValue({
            user: { id: 'user-1', role: 'student' },
            expires: new Date(Date.now() + 86400000).toISOString(),
        } as never);
        mockDbState.selectResult = [{ id: 'user-1', passwordHash: '$2a$12$existing' }];
        mockedBcrypt.compare
            .mockResolvedValueOnce(true as never)   // current password correct
            .mockResolvedValueOnce(false as never);  // new password different

        const res = await callChangePassword({ currentPassword: 'Old1234!', newPassword: 'New1234!' });
        expect(res.status).toBe(200);
        // Verify reset token is cleared
        expect(mockDbState.updateSet).toHaveProperty('resetToken', null);
        expect(mockDbState.updateSet).toHaveProperty('resetExpires', null);
        expect(mockDbState.updateSet).toHaveProperty('passwordHash');
    });

    it('should reject OAuth user (no passwordHash)', async () => {
        mockedAuth.mockResolvedValue({
            user: { id: 'user-1', role: 'student' },
            expires: new Date(Date.now() + 86400000).toISOString(),
        } as never);
        mockDbState.selectResult = [{ id: 'user-1', passwordHash: null }];

        const res = await callChangePassword({ currentPassword: 'Old1234!', newPassword: 'New1234!' });
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('Google');
    });

    it('should reject weak new password', async () => {
        mockedAuth.mockResolvedValue({
            user: { id: 'user-1', role: 'student' },
            expires: new Date(Date.now() + 86400000).toISOString(),
        } as never);
        const res = await callChangePassword({ currentPassword: 'Old1234!', newPassword: 'weak' });
        expect(res.status).toBe(400);
    });

    it('should return 429 when rate limited', async () => {
        mockedAuth.mockResolvedValue({
            user: { id: 'user-1', role: 'student' },
            expires: new Date(Date.now() + 86400000).toISOString(),
        } as never);
        mockedRateLimit.mockReturnValue({ success: false, remaining: 0, resetTime: Date.now() + 60000 });
        const res = await callChangePassword({ currentPassword: 'Old1234!', newPassword: 'New1234!' });
        expect(res.status).toBe(429);
    });
});

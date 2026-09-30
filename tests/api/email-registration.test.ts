import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ request: vi.fn(), complete: vi.fn(), limit: vi.fn() }));
vi.mock('@/lib/email-registration', () => ({
    requestEmailRegistration: mocks.request, completeEmailRegistration: mocks.complete,
    REGISTRATION_ACCEPTED: { message: 'ตรวจสอบคำขอแล้ว', retryAfterSeconds: 60 },
}));
vi.mock('@/lib/auth-rate-limit', () => ({
    consumeAuthRateLimit: mocks.limit,
    authRateLimitUnavailableResponse: () => new Response(null, { status: 503 }),
}));
import { POST as requestRegistration } from '@/app/api/auth/register/route';
import { POST as confirmRegistration } from '@/app/api/auth/register/confirm/route';

const request = (body: unknown) => new Request('http://localhost/api/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const valid = { token: 'a'.repeat(64), name: 'Mailbox Owner', password: 'OwnerPassword1!' };
beforeEach(() => {
    vi.clearAllMocks();
    mocks.limit.mockResolvedValue({ success: true, resetTime: Date.now() + 60000 });
    mocks.request.mockResolvedValue(undefined);
    mocks.complete.mockResolvedValue({ loginHref: '/login?callbackUrl=%2Fcourses' });
});
describe('email registration HTTP boundary', () => {
    it('requests verification without using an unverified password or role', async () => {
        const response = await requestRegistration(request({ email: ' NEW@Example.Test ', password: 'AttackerPass1', role: 'admin', callbackUrl: '/courses' }));
        expect(response.status).toBe(200);
        expect(mocks.request).toHaveBeenCalledWith('new@example.test', '/courses');
        expect(mocks.complete).not.toHaveBeenCalled();
        expect(await response.json()).toEqual({ message: 'ตรวจสอบคำขอแล้ว', retryAfterSeconds: 60 });
        expect(mocks.limit.mock.calls[1][0].identifier).not.toContain('@');
        expect(mocks.limit).toHaveBeenCalledTimes(3);
    });
    it('returns the same neutral contract for email throttling without sending again', async () => {
        mocks.limit.mockResolvedValueOnce({ success: true }).mockResolvedValueOnce({ success: false });
        const response = await requestRegistration(request({ email: 'new@example.test' }));
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ message: 'ตรวจสอบคำขอแล้ว', retryAfterSeconds: 60 });
        expect(mocks.request).not.toHaveBeenCalled();
    });
    it.each([requestRegistration, confirmRegistration])('fails closed if rate limiting is unavailable', async (handler) => {
        mocks.limit.mockRejectedValue(new Error('private'));
        expect((await handler(request(valid))).status).toBe(503);
        expect(mocks.request).not.toHaveBeenCalled(); expect(mocks.complete).not.toHaveBeenCalled();
    });
    it.each([requestRegistration, confirmRegistration])('rejects IP throttling', async (handler) => {
        mocks.limit.mockResolvedValue({ success: false, resetTime: Date.now() + 60000 });
        expect((await handler(request(valid))).status).toBe(429);
    });
    it.each(['invalid', '', 'a'.repeat(260) + '@example.test'])('rejects invalid email %s', async (email) => {
        expect((await requestRegistration(request({ email }))).status).toBe(400);
        expect(mocks.request).not.toHaveBeenCalled();
    });
    it.each([{ ...valid, token: 'bad' }, { ...valid, name: 'x' }, { ...valid, password: 'weak' }, { ...valid, password: 'A1' + 'a'.repeat(128) }])('rejects invalid confirmation', async (body) => {
        expect((await confirmRegistration(request(body))).status).toBe(400);
        expect(mocks.complete).not.toHaveBeenCalled();
    });
    it('uses token-bound email/return destination rather than body email or role', async () => {
        const response = await confirmRegistration(request({ ...valid, email: 'other@example.test', role: 'admin', callbackUrl: 'https://evil.test' }));
        expect(response.status).toBe(200);
        expect(mocks.complete).toHaveBeenCalledWith(valid.token, valid.name, valid.password);
        expect((await response.json()).loginHref).toBe('/login?callbackUrl=%2Fcourses');
        expect(response.headers.get('set-cookie')).toBeNull();
    });
    it('rejects used/expired/colliding tokens', async () => {
        mocks.complete.mockResolvedValue(null);
        const response = await confirmRegistration(request(valid));
        expect(response.status).toBe(400);
        expect((await response.json()).kind).toBe('invalid_or_expired_link');
    });
    it.each([requestRegistration, confirmRegistration])('rejects malformed JSON', async (handler) => {
        expect((await handler(new Request('http://localhost', { method: 'POST', body: '{' }))).status).toBe(400);
    });
});

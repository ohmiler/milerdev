import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    createTransport: vi.fn(),
    sendMail: vi.fn(),
    resendSend: vi.fn(),
    logError: vi.fn(),
    logEvent: vi.fn(),
}));

vi.mock('nodemailer', () => ({
    default: {
        createTransport: mocks.createTransport,
    },
}));

vi.mock('resend', () => ({
    Resend: vi.fn().mockImplementation(() => ({ emails: { send: mocks.resendSend } })),
}));

vi.mock('@/lib/error-handler', () => ({
    logError: mocks.logError,
    logEvent: mocks.logEvent,
}));

const originalEnv = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
};

describe('email SMTP security boundary', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        delete process.env.RESEND_API_KEY;
        process.env.SMTP_HOST = 'smtp.example.test';
        process.env.SMTP_PORT = '587';
        process.env.SMTP_SECURE = 'false';
        process.env.SMTP_USER = 'mailer@example.test';
        process.env.SMTP_PASS = 'test-password';
        mocks.sendMail.mockResolvedValue(undefined);
        mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail });
    });

    afterEach(() => {
        for (const [key, value] of Object.entries(originalEnv)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    });

    it('keeps attacker-controlled contact content out of Nodemailer raw and remote-content options', async () => {
        const { sendContactNotification } = await import('@/lib/email');
        const payload = '<img src="file:///etc/passwd"><script>alert(1)</script>';

        await sendContactNotification({
            name: payload,
            email: 'student@example.test',
            subject: payload,
            message: payload,
            clientIP: '203.0.113.10',
        });

        expect(mocks.createTransport).toHaveBeenCalledWith({
            host: 'smtp.example.test',
            port: 587,
            secure: false,
            auth: {
                user: 'mailer@example.test',
                pass: 'test-password',
            },
        });

        const message = mocks.sendMail.mock.calls[0]?.[0] as Record<string, unknown>;
        expect(message).not.toHaveProperty('raw');
        expect(message).not.toHaveProperty('attachments');
        expect(message).not.toHaveProperty('alternatives');
        expect(message).not.toHaveProperty('envelope');
        expect(message).not.toHaveProperty('list');
        expect(message).not.toHaveProperty('icalEvent');
        expect(message.html).toContain('&lt;img src=&quot;file:///etc/passwd&quot;&gt;');
        expect(message.html).not.toContain('<script>');
    });

    it('preserves the ordinary SMTP fallback behavior', async () => {
        const { sendWelcomeEmail } = await import('@/lib/email');

        await expect(sendWelcomeEmail({
            email: 'student@example.test',
            name: 'Student',
        })).resolves.toBe(true);

        expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({
            to: 'student@example.test',
            subject: expect.any(String),
            html: expect.any(String),
        }));
        expect(mocks.logEvent).toHaveBeenCalledWith('email.smtp.sent');
    });

    it('puts registration tokens in the fragment and sends no chosen password', async () => {
        const { sendRegistrationVerificationEmail } = await import('@/lib/email');
        const { resolveSafeAuthReturn } = await import('@/lib/safe-auth-return');
        await sendRegistrationVerificationEmail({ email: 'owner@example.test', token: 'a'.repeat(64), returnTo: resolveSafeAuthReturn('/courses').pathname });
        const html = mocks.sendMail.mock.calls[0][0].html;
        expect(html).toContain('#token=' + 'a'.repeat(64));
        expect(html).not.toContain('?token=');
        expect(html).toContain('callbackUrl=%2Fcourses');
    });

    it('recognizes Resend resolved errors without logging provider payloads', async () => {
        process.env.RESEND_API_KEY = 'test-placeholder';
        mocks.resendSend.mockResolvedValue({ data: null, error: { message: 'private body' } });
        const { sendWelcomeEmail } = await import('@/lib/email');
        expect(await sendWelcomeEmail({ email: 'owner@example.test', name: 'Owner' })).toBe(false);
        expect(mocks.logEvent).toHaveBeenCalledWith('email.provider.rejected', 'warn');
        expect(JSON.stringify(mocks.logEvent.mock.calls)).not.toContain('private body');
    });
});

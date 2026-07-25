import { afterEach, describe, expect, it, vi } from 'vitest';

import { logError, logEvent } from '@/lib/error-handler';

describe('safe server logging', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
    });

    it('redacts error details and context from production logs', () => {
        vi.stubEnv('NODE_ENV', 'production');
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const error = new Error('customer@example.com token=secret payment=pay-1');
        error.name = 'Provider Error';

        logError(error, { action: 'email.send.failed' });

        expect(consoleError).toHaveBeenCalledOnce();
        const output = String(consoleError.mock.calls[0][0]);
        expect(JSON.parse(output)).toMatchObject({
            level: 'error',
            event: 'email.send.failed',
            errorType: 'Error',
        });
        expect(output).not.toContain('customer@example.com');
        expect(output).not.toContain('token=secret');
        expect(output).not.toContain('pay-1');
        expect(output).not.toContain('stack');
        expect(output).not.toContain('message');
    });

    it('keeps development diagnostics without arbitrary context', () => {
        vi.stubEnv('NODE_ENV', 'development');
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const error = new Error('diagnostic detail');

        logError(error, { action: 'application.failed' });

        const output = consoleError.mock.calls.map((call) => call.join(' ')).join(' ');
        expect(output).toContain('diagnostic detail');
        expect(output).toContain('application.failed');
    });

    it('rejects dynamic operational event labels', () => {
        const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);

        logEvent('payment fulfilled for customer@example.com');

        const output = String(consoleLog.mock.calls[0][0]);
        expect(JSON.parse(output)).toMatchObject({
            level: 'info',
            event: 'application.event',
        });
        expect(output).not.toContain('customer@example.com');
    });
});
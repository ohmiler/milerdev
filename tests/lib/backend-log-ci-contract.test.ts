import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function source(path: string): string {
    return readFileSync(resolve(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
}

describe('backend production logging contract', () => {
    it('does not log recipient or subject data from email delivery', () => {
        const email = source('src/lib/email.ts');

        expect(email).not.toMatch(/console\.(?:log|warn|error)\([^\n]*(?:\bto\b|subject)/);
        expect(email).toContain("logEvent('email.resend.sent')");
        expect(email).toContain("{ action: 'email.send.failed' }");
    });

    it('does not log certificate, payment, event, or raw Bunny response identifiers', () => {
        const progress = source('src/app/api/progress/route.ts');
        const webhook = source('src/app/api/stripe/webhook/route.ts');
        const bunny = source('src/lib/bunny-storage.ts');

        expect(progress).not.toMatch(/console\.log\([^\n]*(?:certificateCode|user\.id)/);
        expect(webhook).not.toMatch(/console\.(?:log|warn|error)\([^\n]*(?:event\.id|payment\.id|paymentId)/);
        expect(bunny).not.toContain('response.text()');
        expect(bunny).not.toContain('errorText');
    });
});

describe('CI test gate contract', () => {
    it('runs required tests non-interactively before Build', () => {
        const workflow = source('.github/workflows/ci.yml');

        expect(workflow).toMatch(/\n  test:\n[\s\S]*?run: npm run test -- --run/);
        expect(workflow).toMatch(/\n  required-e2e:\n[\s\S]*?run: npm run test:e2e:required/);
        expect(workflow).toContain('needs: [lint-and-typecheck, test, required-e2e]');
        expect(workflow).not.toContain('# test:');
    });
});
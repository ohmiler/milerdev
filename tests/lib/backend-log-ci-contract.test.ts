import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function source(path: string): string {
    return readFileSync(resolve(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
}

describe('backend production logging contract', () => {
    it('does not log recipient or subject data from email delivery', () => {
        const email = source('src/lib/notifications/email.ts');

        expect(email).not.toMatch(/console\.(?:log|warn|error)\([^\n]*(?:\bto\b|subject)/);
        expect(email).toContain("logEvent('email.resend.sent')");
        expect(email).toContain("{ action: 'email.send.failed' }");
    });

    it('does not log certificate, payment, event, or raw Bunny response identifiers', () => {
        const progress = source('src/app/api/progress/route.ts');
        const webhook = source('src/app/api/stripe/webhook/route.ts');
        const bunny = source('src/lib/bunny/storage.ts');

        expect(progress).not.toMatch(/console\.log\([^\n]*(?:certificateCode|user\.id)/);
        expect(webhook).not.toMatch(/console\.(?:log|warn|error)\([^\n]*(?:event\.id|payment\.id|paymentId)/);
        expect(bunny).not.toContain('response.text()');
        expect(bunny).not.toContain('errorText');
    });
});

function sourceFiles(dir: string): string[] {
    return readdirSync(resolve(process.cwd(), dir), { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
        .map((entry) => `${entry.parentPath}/${entry.name}`.replace(/\\/g, '/'));
}

/**
 * Money, enrollment and reconciliation routes still to be converted (separate PR, kept apart
 * because these are high-risk areas). Remove entries as they are converted; do not add new ones.
 */
const ROUTES_STILL_TO_CONVERT: string[] = [
    '/admin/certificates/route.ts',
    '/admin/certificates/[id]/route.ts',
    '/admin/enrollments/import/route.ts',
    '/admin/enrollments/route.ts',
    '/admin/enrollments/[id]/route.ts',
    '/admin/payments/route.ts',
    '/admin/payments/[id]/route.ts',
    '/admin/reconciliation/route.ts',
    '/admin/reconciliation/[paymentId]/retry/route.ts',
    '/admin/reconciliation/[paymentId]/route.ts',
    '/admin/users/[id]/enrollments/route.ts',
    '/bundles/enroll/route.ts',
    '/enroll/route.ts',
    '/enrollments/check/route.ts',
    '/enrollments/route.ts',
    '/progress/route.ts',
    '/promptpay/intents/route.ts',
    '/stripe/bundle-checkout/route.ts',
    '/stripe/checkout/route.ts',
];

describe('server error logging contract', () => {
    const files = [...sourceFiles('src/app/api'), resolve(process.cwd(), 'src/app/sitemap.ts').replace(/\\/g, '/')]
        .filter((file) => !ROUTES_STILL_TO_CONVERT.some((skip) => file.endsWith(skip)));

    it('never passes a raw error object to console.error in routes', () => {
        const offenders = files.filter((file) =>
            /console\.error\([^)]*\b(?:error|err)\s*\)/.test(readFileSync(file, 'utf8')),
        );

        expect(offenders).toEqual([]);
    });

    it('gives every logError a stable dot-style label of at most 100 characters', () => {
        const bad: string[] = [];
        for (const file of files) {
            const text = readFileSync(file, 'utf8');
            for (const match of text.matchAll(/logError\([^;]*?\{\s*action:\s*(['"])([^'"]*)\1/g)) {
                const label = match[2];
                if (!/^[a-z0-9_]+(\.[a-z0-9_]+)+$/.test(label) || label.length > 100) {
                    bad.push(`${file}: ${label}`);
                }
            }
        }

        expect(bad).toEqual([]);
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
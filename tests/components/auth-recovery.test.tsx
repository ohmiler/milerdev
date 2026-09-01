import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(path, 'utf8');

describe('account recovery UI contracts', () => {
  it('keeps Forgot Password neutral and preserves its request and retry contracts', () => {
    const page = readSource('src/app/forgot-password/page.tsx');
    const source = readSource('src/components/auth/ForgotPasswordForm.tsx');

    expect(page).not.toContain('use client');
    expect(page).toContain('<ForgotPasswordForm');
    expect(source).toContain("fetch('/api/auth/reset-password'");
    expect(source).toContain("method: 'POST'");
    expect(source).toContain("'Content-Type': 'application/json'");
    expect(source).toContain("type={'email'}");
    expect(source).toContain("autoComplete={'email'}");
    expect(source).toContain("type={'button'}");
    expect(source).toContain("setEmail('')");
  });

  it('keeps Reset Password static-shell friendly and treats the token as opaque request data', () => {
    const page = readSource('src/app/reset-password/page.tsx');
    const source = readSource('src/components/auth/ResetPasswordForm.tsx');

    expect(page).not.toContain('use client');
    expect(page).toContain('<ResetPasswordForm');
    expect(source).toContain("fetch('/api/auth/reset-password/confirm'");
    expect(source).toContain('JSON.stringify({ token, newPassword: password })');
    expect(source).not.toContain('{token}');
    expect(source).not.toContain('console.');
  });

  it('preserves Reset password request field contracts', () => {
    const source = readSource('src/components/auth/ResetPasswordForm.tsx');

    expect(source).toContain("name={'password'}");
    expect(source).toContain("name={'confirmPassword'}");
    expect(source.match(/minLength=\{8\}/g)).toHaveLength(2);
    expect(source.match(/autoComplete=\{'new-password'\}/g)).toHaveLength(2);
  });
});

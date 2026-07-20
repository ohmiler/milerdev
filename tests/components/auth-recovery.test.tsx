import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(path, 'utf8');

describe('account recovery UI contracts', () => {
  it('keeps Forgot Password neutral and preserves its request and retry contracts', () => {
    const page = readSource('src/app/forgot-password/page.tsx');
    const source = readSource('src/components/auth/ForgotPasswordForm.tsx');

    expect(page).not.toContain('use client');
    expect(page).toContain('<ForgotPasswordForm />');
    expect(source).toContain("fetch('/api/auth/reset-password'");
    expect(source).toContain("method: 'POST'");
    expect(source).toContain("'Content-Type': 'application/json'");
    expect(source).toContain('JSON.stringify({ email })');
    expect(source).toContain('หากอีเมล');
    expect(source).toContain('มีในระบบ');
    expect(source).toContain("type={'email'}");
    expect(source).toContain("autoComplete={'email'}");
    expect(source).toContain("type={'button'}");
    expect(source).toContain("setEmail('')");
  });

  it('keeps Reset Password static-shell friendly and treats the token as opaque request data', () => {
    const page = readSource('src/app/reset-password/page.tsx');
    const source = readSource('src/components/auth/ResetPasswordForm.tsx');

    expect(page).not.toContain('use client');
    expect(page).toContain('<Suspense');
    expect(page).toContain('<ResetPasswordForm />');
    expect(source).toContain('useSearchParams()');
    expect(source).toContain("searchParams.get('token')");
    expect(source).toContain("fetch('/api/auth/reset-password/confirm'");
    expect(source).toContain('JSON.stringify({ token, newPassword: password })');
    expect(source).not.toContain('{token}');
    expect(source).not.toContain('console.');
  });

  it('preserves Reset password constraints and missing/error/success recovery targets', () => {
    const source = readSource('src/components/auth/ResetPasswordForm.tsx');

    expect(source).toContain("name={'password'}");
    expect(source).toContain("name={'confirmPassword'}");
    expect(source.match(/minLength=\{8\}/g)).toHaveLength(2);
    expect(source.match(/autoComplete=\{'new-password'\}/g)).toHaveLength(2);
    expect(source).toContain('รหัสผ่านไม่ตรงกัน');
    expect(source).toContain('ลิงก์ไม่ถูกต้อง');
    expect(source).toContain('ตั้งรหัสผ่านใหม่สำเร็จ!');
    expect(source).toContain("href={'/forgot-password'}");
    expect(source).toContain("href={'/login'}");
  });
});

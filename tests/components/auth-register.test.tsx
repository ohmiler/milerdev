import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(path, 'utf8');

describe('Register UI contracts', () => {
  it('keeps the route server-owned and preserves its identity request boundary', () => {
    const page = readSource('src/app/register/page.tsx');
    const source = readSource('src/components/auth/RegisterForm.tsx');

    expect(page).not.toContain('use client');
    expect(page).toContain('<RegisterForm />');
    expect(source).toContain("fetch('/api/auth/register'");
    expect(source).toContain("method: 'POST'");
    expect(source).toContain("'Content-Type': 'application/json'");
    expect(source).toContain('JSON.stringify({ name, email, password })');
    expect(source).toContain("signIn('credentials'");
    expect(source).toContain("router.push('/login')");
    expect(source).toContain("router.push('/dashboard')");
    expect(source).toContain("signIn('google', { callbackUrl: '/dashboard' })");
  });

  it('keeps fields and client password policy aligned with the API', () => {
    const source = readSource('src/components/auth/RegisterForm.tsx');

    expect(source).toContain("name={'name'}");
    expect(source).toContain('name.trim().length < 2');
    expect(source).toContain('maxLength={100}');
    expect(source).toContain("name={'email'}");
    expect(source).toContain("name={'password'}");
    expect(source).toContain('password.length < 8');
    expect(source).toContain('/[A-Z]/');
    expect(source).toContain('/[a-z]/');
    expect(source).toContain('/[0-9]/');
    expect(source).toContain("name={'confirmPassword'}");
    expect(source).toContain('รหัสผ่านไม่ตรงกัน');
    expect(source).toContain('อักขระพิเศษ (แนะนำ)');
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(path, 'utf8');

describe('account journey UI contracts', () => {
  it('keeps Login and Register form-only while reserving context panels for recovery', () => {
    const shell = readSource('src/components/auth/AuthShell.tsx');
    const login = readSource('src/app/login/page.tsx');
    const register = readSource('src/app/register/page.tsx');

    expect(shell).toContain("const showContextPanel = variant === 'recovery';");
    expect(shell).toContain("showContextPanel ? 'grid max-w-6xl");
    expect(shell).toContain("variant === 'register' && 'max-w-2xl'");
    expect(login).not.toContain('contextMeta=');
    expect(login).not.toContain('evidence=');
    expect(register).not.toContain('contextMeta=');
    expect(register).not.toContain('evidence=');
  });

  it('keeps Login server-owned with a Suspense-contained client form island', () => {
    const page = readSource('src/app/login/page.tsx');
    const form = readSource('src/components/auth/LoginForm.tsx');

    expect(page).not.toContain('use client');
    expect(page).toContain('<Suspense');
    expect(page).toContain('<LoginForm />');
    expect(form).toContain('useSearchParams()');
  });

  it('preserves Login credentials, provider, error, and redirect contracts', () => {
    const source = readSource('src/components/auth/LoginForm.tsx');

    expect(source).toContain("signIn('credentials'");
    expect(source).toContain('redirect: false');
    expect(source).toContain("router.push('/dashboard')");
    expect(source).toContain("signIn('google', { callbackUrl: '/dashboard' })");
    expect(source).toContain('OAuthAccountNotLinked');
    expect(source).toContain('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    expect(source).toMatch(/name=(?:["']email["']|\{["']email["']\})/);
    expect(source).toMatch(/autoComplete=(?:["']current-password["']|\{["']current-password["']\})/);
    expect(source).toMatch(/type=(?:["']submit["']|\{["']submit["']\})/);
    expect(source).toMatch(/type=(?:["']button["']|\{["']button["']\})/);
  });

  it('locks every account form while its request is pending', () => {
    const forms = [
      'src/components/auth/LoginForm.tsx',
      'src/components/auth/RegisterForm.tsx',
      'src/components/auth/ForgotPasswordForm.tsx',
      'src/components/auth/ResetPasswordForm.tsx',
    ];

    forms.forEach((path) => {
      const source = readSource(path);
      expect(source).toContain('aria-busy={loading}');
      expect(source).toContain('disabled={loading}');
    });
  });
});

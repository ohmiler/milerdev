/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import LoginPage from '@/app/login/page';
import RegisterPage from '@/app/register/page';
import ForgotPasswordPage from '@/app/forgot-password/page';
import ResetPasswordPage from '@/app/reset-password/page';
import { createAuthReturnHref, resolveSafeAuthReturn } from '@/lib/safe-auth-return';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  signIn: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
  usePathname: () => '/login',
  useSearchParams: () => mocks.searchParams,
}));

vi.mock('next-auth/react', () => ({
  signIn: mocks.signIn,
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}));

vi.mock('@/components/auth/AuthShell', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe('auth safe-return integration', () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.refresh.mockReset();
    mocks.signIn.mockReset();
    mocks.searchParams = new URLSearchParams();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('uses the same course destination for Login credentials, Google, and Register link', async () => {
    mocks.signIn.mockResolvedValue({ error: null });
    const returnTo = resolveSafeAuthReturn('/courses/typescript-foundations').pathname;
    const { container, getByRole } = render(
      <LoginForm
        returnTo={returnTo}
        registerHref={createAuthReturnHref('/register', returnTo)}
        forgotPasswordHref={createAuthReturnHref('/forgot-password', returnTo)}
      />,
    );

    fireEvent.click(getByRole('button', { name: /Google/i }));
    expect(mocks.signIn).toHaveBeenCalledWith('google', {
      callbackUrl: '/courses/typescript-foundations',
    });

    const registerLink = Array.from(container.querySelectorAll('a')).find((link) =>
      link.getAttribute('href')?.startsWith('/register'),
    );
    expect(registerLink?.getAttribute('href')).toBe(
      '/register?callbackUrl=%2Fcourses%2Ftypescript-foundations',
    );

    fireEvent.change(container.querySelector('input[name=email]')!, {
      target: { value: 'learner@example.com' },
    });
    fireEvent.change(container.querySelector('input[name=password]')!, {
      target: { value: 'StrongPass1!' },
    });
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith('/courses/typescript-foundations');
    });
  });

  it('uses the same bundle destination for Register credentials, Google, and Login link', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ success: true }) }),
    );
    mocks.signIn.mockResolvedValue({ error: null });
    const returnTo = resolveSafeAuthReturn('/bundles/full-stack').pathname;
    const { container, getByRole } = render(
      <RegisterForm
        returnTo={returnTo}
        loginHref={createAuthReturnHref('/login', returnTo)}
        forgotPasswordHref={createAuthReturnHref('/forgot-password', returnTo)}
      />,
    );

    fireEvent.click(getByRole('button', { name: /Google/i }));
    expect(mocks.signIn).toHaveBeenCalledWith('google', {
      callbackUrl: '/bundles/full-stack',
    });

    const loginLink = Array.from(container.querySelectorAll('a')).find((link) =>
      link.getAttribute('href')?.startsWith('/login'),
    );
    expect(loginLink?.getAttribute('href')).toBe(
      '/login?callbackUrl=%2Fbundles%2Ffull-stack',
    );

    for (const [name, value] of [
      ['name', 'Test Learner'],
      ['email', 'learner@example.com'],
      ['password', 'StrongPass1!'],
      ['confirmPassword', 'StrongPass1!'],
    ]) {
      fireEvent.change(container.querySelector(`input[name=${name}]`)!, {
        target: { value },
      });
    }
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith('/bundles/full-stack');
    });
  });

  it('validates callbackUrl at both server-owned auth page boundaries', async () => {
    const loginView = await LoginPage({
      searchParams: Promise.resolve({ callbackUrl: 'https://evil.example/course' }),
    });
    const login = render(loginView);
    const registerLink = Array.from(login.container.querySelectorAll('a')).find((link) =>
      link.getAttribute('href')?.startsWith('/register?callbackUrl='),
    );
    expect(registerLink?.getAttribute('href')).toBe('/register?callbackUrl=%2Fdashboard');

    cleanup();

    const registerView = await RegisterPage({
      searchParams: Promise.resolve({ callbackUrl: '/bundles/full-stack?coupon=secret' }),
    });
    const register = render(registerView);
    const loginLink = Array.from(register.container.querySelectorAll('a')).find((link) =>
      link.getAttribute('href')?.startsWith('/login?callbackUrl='),
    );
    expect(loginLink?.getAttribute('href')).toBe(
      '/login?callbackUrl=%2Fbundles%2Ffull-stack',
    );
  });

  it('shows neutral recovery actions instead of silently redirecting when registration cannot sign in', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ message: 'ตรวจสอบคำขอแล้ว' }),
      }),
    );
    mocks.signIn.mockResolvedValue({ error: 'CredentialsSignin' });
    const returnTo = resolveSafeAuthReturn('/courses/typescript-foundations').pathname;
    const view = render(
      <RegisterForm
        returnTo={returnTo}
        loginHref={createAuthReturnHref('/login', returnTo)}
        forgotPasswordHref={createAuthReturnHref('/forgot-password', returnTo)}
      />,
    );

    for (const [name, value] of [
      ['name', 'Test Member'],
      ['email', 'private@example.com'],
      ['password', 'StrongPass1!'],
      ['confirmPassword', 'StrongPass1!'],
    ]) {
      fireEvent.change(view.container.querySelector(`input[name=${name}]`)!, {
        target: { value },
      });
    }
    fireEvent.submit(view.container.querySelector('form')!);

    await waitFor(() => {
      expect(view.getByText('ตรวจสอบคำขอแล้ว')).toBeTruthy();
    });
    expect(mocks.push).not.toHaveBeenCalled();
    expect(view.queryByText('private@example.com')).toBeNull();
    expect(view.getByRole('link', { name: 'เข้าสู่ระบบ' }).getAttribute('href')).toBe(
      '/login?callbackUrl=%2Fcourses%2Ftypescript-foundations',
    );
  });

  it('uses shared Thai field validation and focuses the first invalid Register field', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const returnTo = resolveSafeAuthReturn('/dashboard').pathname;
    const view = render(
      <RegisterForm
        returnTo={returnTo}
        loginHref={createAuthReturnHref('/login', returnTo)}
        forgotPasswordHref={createAuthReturnHref('/forgot-password', returnTo)}
      />,
    );

    fireEvent.submit(view.container.querySelector('form')!);

    const nameInput = view.container.querySelector('input[name=name]') as HTMLInputElement;
    expect(fetchMock).not.toHaveBeenCalled();
    expect(nameInput.getAttribute('aria-invalid')).toBe('true');
    expect(nameInput.getAttribute('aria-describedby')).toBe('register-name-error');
    expect(document.activeElement).toBe(nameInput);
    expect(nameInput.closest('form')?.noValidate).toBe(true);
    expect(document.getElementById('register-name-error')?.textContent).toBe('กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร');
    expect(view.getByText('มีตัวพิมพ์ใหญ่')).toBeTruthy();
    expect(view.getByRole('link', { name: 'ข้อกำหนดการใช้งาน' }).getAttribute('href')).toBe('/terms');
    expect(view.getByRole('link', { name: 'นโยบายความเป็นส่วนตัว' }).getAttribute('href')).toBe('/privacy');
  });

  it('announces asynchronous Register failures politely without attaching them to a field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: vi.fn().mockResolvedValue({ retryAfter: 30 }),
    }));
    const returnTo = resolveSafeAuthReturn('/dashboard').pathname;
    const view = render(
      <RegisterForm
        returnTo={returnTo}
        loginHref={createAuthReturnHref('/login', returnTo)}
        forgotPasswordHref={createAuthReturnHref('/forgot-password', returnTo)}
      />,
    );

    for (const [name, value] of [
      ['name', 'Test Member'],
      ['email', 'private@example.com'],
      ['password', 'StrongPass1!'],
      ['confirmPassword', 'StrongPass1!'],
    ]) {
      fireEvent.change(view.container.querySelector(`input[name=${name}]`)!, {
        target: { value },
      });
    }
    fireEvent.submit(view.container.querySelector('form')!);

    await waitFor(() => {
      expect(view.getByRole('status').textContent).toContain('ส่งคำขอถี่เกินไป');
    });
    expect(view.getByRole('status').getAttribute('aria-live')).toBe('polite');
    expect(view.container.querySelector('input[name=email]')?.getAttribute('aria-invalid')).toBeNull();
  });

  it('preserves a safe destination from Login through Forgot Password and back to Login', async () => {
    const searchParams = Promise.resolve({ callbackUrl: '/courses/typescript-foundations' });
    const loginView = await LoginPage({ searchParams });
    const login = render(loginView);
    const forgotLink = Array.from(login.container.querySelectorAll('a')).find((link) =>
      link.getAttribute('href')?.startsWith('/forgot-password'),
    );
    expect(forgotLink?.getAttribute('href')).toBe(
      '/forgot-password?callbackUrl=%2Fcourses%2Ftypescript-foundations',
    );

    cleanup();

    const forgotView = await ForgotPasswordPage({ searchParams } as never);
    const forgot = render(forgotView);
    const loginLink = Array.from(forgot.container.querySelectorAll('a')).find((link) =>
      link.getAttribute('href')?.startsWith('/login'),
    );
    expect(loginLink?.getAttribute('href')).toBe(
      '/login?callbackUrl=%2Fcourses%2Ftypescript-foundations',
    );
  });

  it('renders the missing Reset link state on the server with safe recovery destinations', async () => {
    const resetView = await ResetPasswordPage({
      searchParams: Promise.resolve({ callbackUrl: '/courses/typescript-foundations' }),
    });
    const reset = render(resetView);

    expect(reset.getByText('ลิงก์ไม่สมบูรณ์')).toBeTruthy();
    expect(reset.queryAllByLabelText(/รหัสผ่านใหม่/)).toHaveLength(0);
    expect(reset.getByRole('link', { name: 'ขอลิงก์ใหม่' }).getAttribute('href')).toBe(
      '/forgot-password?callbackUrl=%2Fcourses%2Ftypescript-foundations',
    );
    expect(reset.getByRole('link', { name: 'กลับไปหน้าเข้าสู่ระบบ' }).getAttribute('href')).toBe(
      '/login?callbackUrl=%2Fcourses%2Ftypescript-foundations',
    );
  });

  it('shows only the allowlisted password-reset arrival reason on Login', async () => {
    const returnTo = resolveSafeAuthReturn('/courses/typescript-foundations').pathname;
    mocks.searchParams = new URLSearchParams({ reason: 'password-reset' });
    const resetArrival = render(
      <LoginForm
        returnTo={returnTo}
        registerHref={createAuthReturnHref('/register', returnTo)}
        forgotPasswordHref={createAuthReturnHref('/forgot-password', returnTo)}
      />,
    );

    await waitFor(() => {
      expect(resetArrival.getByText('ตั้งรหัสผ่านใหม่แล้ว กรุณาเข้าสู่ระบบอีกครั้ง')).toBeTruthy();
    });

    cleanup();
    mocks.searchParams = new URLSearchParams({ reason: '<img src=x onerror=alert(1)>' });
    const unknownArrival = render(
      <LoginForm
        returnTo={returnTo}
        registerHref={createAuthReturnHref('/register', returnTo)}
        forgotPasswordHref={createAuthReturnHref('/forgot-password', returnTo)}
      />,
    );
    expect(unknownArrival.queryByText('<img src=x onerror=alert(1)>')).toBeNull();
  });
});

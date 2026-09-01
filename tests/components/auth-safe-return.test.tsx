/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import LoginPage from '@/app/login/page';
import RegisterPage from '@/app/register/page';
import { createAuthReturnHref, resolveSafeAuthReturn } from '@/lib/safe-auth-return';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
  usePathname: () => '/login',
  useSearchParams: () => new URLSearchParams(),
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
});

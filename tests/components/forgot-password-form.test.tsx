/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import { DEFAULT_AUTH_RETURN_PATH } from '@/lib/safe-auth-return';

describe('ForgotPasswordForm', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows a neutral result without exposing the submitted email and honors server cooldown', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        message: 'ตรวจสอบคำขอแล้ว',
        retryAfterSeconds: 300,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ForgotPasswordForm returnTo={DEFAULT_AUTH_RETURN_PATH} loginHref={'/login'} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'อีเมล' }), {
      target: { value: 'private@example.com' },
    });
    fireEvent.submit(screen.getByRole('textbox', { name: 'อีเมล' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('ตรวจสอบคำขอแล้ว')).toBeTruthy();
    });

    expect(screen.queryByText('private@example.com')).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/reset-password', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'private@example.com', callbackUrl: DEFAULT_AUTH_RETURN_PATH }),
    }));
    const resendButton = screen.getByRole('button', { name: 'ส่งอีกครั้งใน 5:00' });
    expect((resendButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('uses Thai validation and focuses the invalid email field before sending', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<ForgotPasswordForm returnTo={DEFAULT_AUTH_RETURN_PATH} loginHref={'/login'} />);

    const emailInput = screen.getByRole('textbox', { name: 'อีเมล' });
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    fireEvent.submit(emailInput.closest('form')!);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(emailInput.getAttribute('aria-invalid')).toBe('true');
    expect(emailInput.getAttribute('aria-describedby')).toBe('forgot-email-error');
    expect(screen.getByText('กรุณากรอกอีเมลให้ถูกต้อง')).toBeTruthy();
    expect(document.activeElement).toBe(emailInput);
    expect(emailInput.closest('form')?.noValidate).toBe(true);
  });

  it('presents rate limits as stable Thai polite feedback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: vi.fn().mockResolvedValue({
        error: 'Too many requests. Please try again later.',
        retryAfter: 47,
      }),
    }));
    render(<ForgotPasswordForm returnTo={DEFAULT_AUTH_RETURN_PATH} loginHref={'/login'} />);

    const emailInput = screen.getByRole('textbox', { name: 'อีเมล' });
    fireEvent.change(emailInput, { target: { value: 'member@example.com' } });
    fireEvent.submit(emailInput.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('ส่งคำขอถี่เกินไป กรุณารอ 47 วินาทีแล้วลองใหม่')).toBeTruthy();
    });
    expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite');
    expect(screen.queryByText('Too many requests. Please try again later.')).toBeNull();
  });
});

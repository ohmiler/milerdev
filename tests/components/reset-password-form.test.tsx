/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

describe('ResetPasswordForm', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows a dedicated missing-link state without rendering password fields', () => {
    render(<ResetPasswordForm token={null} forgotPasswordHref={'/forgot-password'} loginHref={'/login'} successLoginHref={'/login?reason=password-reset'} />);

    expect(screen.getByText('ลิงก์ไม่สมบูรณ์')).toBeTruthy();
    expect(screen.queryAllByLabelText(/รหัสผ่านใหม่/)).toHaveLength(0);
    expect(screen.getByRole('link', { name: 'ขอลิงก์ใหม่' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'กลับไปหน้าเข้าสู่ระบบ' })).toBeTruthy();
  });

  it('replaces the form with one safe invalid-link state after token rejection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({
        kind: 'invalid_or_expired_link',
        error: 'ลิงก์นี้ใช้ไม่ได้แล้ว',
      }),
    }));
    render(<ResetPasswordForm token={'opaque-token'} forgotPasswordHref={'/forgot-password'} loginHref={'/login'} successLoginHref={'/login?reason=password-reset'} />);

    fireEvent.change(screen.getByLabelText('รหัสผ่านใหม่'), {
      target: { value: 'NewPassword1' },
    });
    fireEvent.change(screen.getByLabelText('ยืนยันรหัสผ่านใหม่'), {
      target: { value: 'NewPassword1' },
    });
    fireEvent.submit(screen.getByLabelText('รหัสผ่านใหม่').closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('ลิงก์นี้ใช้ไม่ได้แล้ว')).toBeTruthy();
    });
    expect(screen.queryAllByLabelText(/รหัสผ่านใหม่/)).toHaveLength(0);
    expect(screen.getByRole('link', { name: 'ขอลิงก์ใหม่' })).toBeTruthy();
  });

  it('controls password and confirmation visibility independently', () => {
    render(<ResetPasswordForm token={'opaque-token'} forgotPasswordHref={'/forgot-password'} loginHref={'/login'} successLoginHref={'/login?reason=password-reset'} />);

    const password = screen.getByLabelText('รหัสผ่านใหม่') as HTMLInputElement;
    const confirmation = screen.getByLabelText('ยืนยันรหัสผ่านใหม่') as HTMLInputElement;
    fireEvent.click(screen.getByRole('button', { name: 'แสดงรหัสผ่าน' }));

    expect(password.type).toBe('text');
    expect(confirmation.type).toBe('password');
  });

  it('requires a fresh sign-in after success while preserving the safe destination', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ message: 'ตั้งรหัสผ่านใหม่สำเร็จ' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<ResetPasswordForm token={'opaque-token'} forgotPasswordHref={'/forgot-password?callbackUrl=%2Fcourses%2Ftypescript-foundations'} loginHref={'/login?callbackUrl=%2Fcourses%2Ftypescript-foundations'} successLoginHref={'/login?callbackUrl=%2Fcourses%2Ftypescript-foundations&reason=password-reset'} />);

    fireEvent.change(screen.getByLabelText('รหัสผ่านใหม่'), {
      target: { value: 'NewPassword1' },
    });
    fireEvent.change(screen.getByLabelText('ยืนยันรหัสผ่านใหม่'), {
      target: { value: 'NewPassword1' },
    });
    fireEvent.submit(screen.getByLabelText('รหัสผ่านใหม่').closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('ตั้งรหัสผ่านใหม่แล้ว')).toBeTruthy();
    });
    expect(screen.getByText('เพื่อความปลอดภัย กรุณาเข้าสู่ระบบอีกครั้ง')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'ไปหน้าเข้าสู่ระบบ' }).getAttribute('href')).toBe(
      '/login?callbackUrl=%2Fcourses%2Ftypescript-foundations&reason=password-reset',
    );
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/reset-password/confirm', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ token: 'opaque-token', newPassword: 'NewPassword1' }),
    }));
  });

  it('shows the password checklist and focuses the first invalid field before sending', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<ResetPasswordForm token={'opaque-token'} forgotPasswordHref={'/forgot-password'} loginHref={'/login'} successLoginHref={'/login?reason=password-reset'} />);

    const password = screen.getByLabelText('รหัสผ่านใหม่') as HTMLInputElement;
    const confirmation = screen.getByLabelText('ยืนยันรหัสผ่านใหม่') as HTMLInputElement;
    fireEvent.change(password, { target: { value: 'alllowercase' } });
    fireEvent.change(confirmation, { target: { value: 'alllowercase' } });
    fireEvent.submit(password.closest('form')!);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(password.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(password);
    expect(password.closest('form')?.noValidate).toBe(true);
    expect(screen.getByText('มีตัวพิมพ์ใหญ่')).toBeTruthy();
    expect(screen.getByText('มีตัวเลข')).toBeTruthy();
    expect(screen.getByText('รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว')).toBeTruthy();
  });
});

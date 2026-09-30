// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RegisterForm from '@/components/auth/RegisterForm';
import VerifyEmailForm from '@/components/auth/VerifyEmailForm';
import { resolveSafeAuthReturn } from '@/lib/safe-auth-return';
const mocks = vi.hoisted(() => ({ signIn: vi.fn() }));
vi.mock('next-auth/react', () => ({ signIn: mocks.signIn }));

beforeEach(() => { vi.clearAllMocks(); window.history.replaceState(null, '', '/verify-email'); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const verification = () => render(<StrictMode><VerifyEmailForm registerHref="/register" loginHref="/login" /></StrictMode>);
describe('email verification UI', () => {
  it('requests email first without creating a credentials session and offers a throttled resend', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ retryAfterSeconds: 60 }) });
    vi.stubGlobal('fetch', fetchMock);
    const view = render(<RegisterForm returnTo={resolveSafeAuthReturn('/courses').pathname} loginHref="/login" forgotPasswordHref="/forgot-password" />);
    expect(view.queryByLabelText('รหัสผ่าน')).toBeNull();
    fireEvent.change(view.getByLabelText('อีเมล'), { target: { value: 'owner@example.test' } });
    fireEvent.click(view.getByRole('button', { name: 'ส่งลิงก์ยืนยันอีเมล' }));
    await waitFor(() => expect(view.getByText('ตรวจสอบคำขอแล้ว')).toBeTruthy());
    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({ body: JSON.stringify({ email: 'owner@example.test', callbackUrl: '/courses' }) }));
    const resend = view.getByRole('button', { name: /ส่งอีเมลอีกครั้งได้ใน/ }) as HTMLButtonElement;
    expect(resend.disabled).toBe(true);
    fireEvent.click(resend);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('does not confirm on GET, removes the fragment and submits only when the owner chooses credentials', async () => {
    const token = 'a'.repeat(64);
    window.history.replaceState(null, '', '/verify-email#token=' + token);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ loginHref: '/login?callbackUrl=%2Fcourses' }) });
    vi.stubGlobal('fetch', fetchMock);
    const view = verification();
    expect(window.location.hash).toBe('');
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.change(view.getByLabelText('ชื่อ-นามสกุล'), { target: { value: 'Mailbox Owner' } });
    fireEvent.change(view.getByLabelText('รหัสผ่าน', { exact: true }), { target: { value: 'OwnerPassword1!' } });
    fireEvent.change(view.getByLabelText('ยืนยันรหัสผ่าน'), { target: { value: 'OwnerPassword1!' } });
    fireEvent.click(view.getByRole('button', { name: 'ยืนยันอีเมลและสร้างบัญชี' }));
    await waitFor(() => expect(view.getByText('ยืนยันอีเมลและสร้างบัญชีแล้ว')).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/register/confirm', expect.objectContaining({ body: JSON.stringify({ token, name: 'Mailbox Owner', password: 'OwnerPassword1!' }) }));
    expect(view.getByRole('link', { name: 'เข้าสู่ระบบ' }).getAttribute('href')).toBe('/login?callbackUrl=%2Fcourses');
    expect(mocks.signIn).not.toHaveBeenCalled();
  });
  it('offers a new link when no valid fragment exists', () => {
    const view = verification();
    expect(view.getByText('กรุณาเปิดลิงก์จากอีเมล')).toBeTruthy();
    expect(view.queryByLabelText('รหัสผ่าน')).toBeNull();
    expect(view.getByRole('link', { name: 'ขอลิงก์ยืนยันใหม่' })).toBeTruthy();
  });
  it('keeps retry/recovery available when the token is expired or confirmation fails', async () => {
    window.history.replaceState(null, '', '/verify-email#token=' + 'b'.repeat(64));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ kind: 'invalid_or_expired_link' }) }));
    const view = verification();
    fireEvent.change(view.getByLabelText('ชื่อ-นามสกุล'), { target: { value: 'Owner' } });
    for (const label of ['รหัสผ่าน', 'ยืนยันรหัสผ่าน']) fireEvent.change(view.getByLabelText(label, { exact: true }), { target: { value: 'OwnerPassword1!' } });
    fireEvent.click(view.getByRole('button', { name: 'ยืนยันอีเมลและสร้างบัญชี' }));
    await waitFor(() => expect(view.getByRole('alert').textContent).toContain('ไม่สามารถยืนยันได้'));
    expect(view.getByRole('link', { name: 'ขอลิงก์ยืนยันใหม่' })).toBeTruthy();
  });
});

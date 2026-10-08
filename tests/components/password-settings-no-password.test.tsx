// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock('next-auth/react', () => ({ signOut: vi.fn() }));

import PasswordSettingsForm from '@/components/settings/PasswordSettingsForm';

afterEach(cleanup);

describe('PasswordSettingsForm without a password', () => {
  it('tells a Google account it needs no separate password', () => {
    render(<PasswordSettingsForm hasPassword={false} signsInWithGoogle />);

    expect(screen.getByText(/เข้าสู่ระบบด้วย Google จึงไม่ต้องตั้งรหัสผ่านแยก/)).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'ตั้งรหัสผ่านผ่านอีเมล' })).toBeNull();
  });

  it('does not claim Google for an account without one, and offers to set a first password by email', () => {
    render(<PasswordSettingsForm hasPassword={false} />);

    expect(screen.queryByText(/Google/)).toBeNull();
    expect(screen.getByText('บัญชีนี้ยังไม่มีรหัสผ่าน')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'ตั้งรหัสผ่านผ่านอีเมล' }).getAttribute('href')).toBe('/forgot-password');
  });

  it('keeps the change-password form for an account with a password', () => {
    render(<PasswordSettingsForm hasPassword signsInWithGoogle />);

    expect(screen.getByRole('button', { name: /เปลี่ยนรหัสผ่าน/ })).toBeTruthy();
  });
});

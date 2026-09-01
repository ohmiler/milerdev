/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PasswordSettingsForm from '@/components/settings/PasswordSettingsForm';

const mocks = vi.hoisted(() => ({ signOut: vi.fn() }));

vi.mock('next-auth/react', () => ({ signOut: mocks.signOut }));

describe('PasswordSettingsForm fresh sign-in', () => {
  beforeEach(() => mocks.signOut.mockReset());

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('ends the current session after a successful password change', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    mocks.signOut.mockResolvedValue(undefined);

    render(<PasswordSettingsForm hasPassword />);
    fireEvent.click(screen.getByRole('button', { name: /เปลี่ยนรหัสผ่าน/ }));

    fireEvent.change(screen.getByLabelText('รหัสผ่านปัจจุบัน'), {
      target: { value: 'CurrentPassword1' },
    });
    fireEvent.change(screen.getByLabelText('รหัสผ่านใหม่'), {
      target: { value: 'NewPassword2' },
    });
    fireEvent.change(screen.getByLabelText('ยืนยันรหัสผ่านใหม่'), {
      target: { value: 'NewPassword2' },
    });
    fireEvent.submit(screen.getByLabelText('รหัสผ่านใหม่').closest('form')!);

    await waitFor(() => {
      expect(mocks.signOut).toHaveBeenCalledWith({
        callbackUrl: '/login?reason=password-changed',
      });
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/change-password', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        currentPassword: 'CurrentPassword1',
        newPassword: 'NewPassword2',
      }),
    }));
  });
});

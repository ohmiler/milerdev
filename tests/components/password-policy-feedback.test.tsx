/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import PasswordPolicyFeedback from '@/components/auth/PasswordPolicyFeedback';
describe('PasswordPolicyFeedback', () => {
  afterEach(cleanup);
  it('shows the actual requirements without claiming a strength score', () => {
    render(<PasswordPolicyFeedback password="short" id="password-policy" />);
    expect(screen.getByText('ยาว 15–128 ตัวอักษร').closest('li')?.textContent).toContain('ยังไม่ผ่าน');
    expect(screen.getByText(/ระบบจะตรวจรหัสผ่านที่พบในข้อมูลรั่วไหล/)).toBeDefined();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});

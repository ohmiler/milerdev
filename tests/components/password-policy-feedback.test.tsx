/** @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import PasswordPolicyFeedback from '@/components/auth/PasswordPolicyFeedback';

describe('PasswordPolicyFeedback', () => {
  afterEach(cleanup);

  it('communicates each live requirement without relying on color', () => {
    render(<PasswordPolicyFeedback password={'lowercase1'} id={'password-policy'} />);

    expect(screen.getByText('มีตัวพิมพ์เล็ก').closest('li')?.textContent).toContain('ผ่าน');
    expect(screen.getByText('มีตัวเลข').closest('li')?.textContent).toContain('ผ่าน');
    expect(screen.getByText('มีตัวพิมพ์ใหญ่').closest('li')?.textContent).toContain('ยังไม่ผ่าน');
    expect(screen.getByText('อักขระพิเศษ (แนะนำ)').closest('li')?.textContent).toContain('ยังไม่ผ่าน');
  });
});

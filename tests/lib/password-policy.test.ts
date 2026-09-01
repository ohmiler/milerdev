import { describe, expect, it } from 'vitest';

import { getPasswordPolicy, getPasswordPolicyError } from '@/lib/password-policy';

describe('password policy', () => {
  it('uses the required account password rules and keeps special characters recommended', () => {
    expect(getPasswordPolicyError('short')).toBe('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
    expect(getPasswordPolicyError('lowercase1')).toBe('รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว');
    expect(getPasswordPolicyError('UPPERCASE1')).toBe('รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว');
    expect(getPasswordPolicyError('NoNumbers')).toBe('รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว');
    expect(getPasswordPolicyError('Required1')).toBe('');
    expect(getPasswordPolicy('Required1').checks.special).toBe(false);
  });
});

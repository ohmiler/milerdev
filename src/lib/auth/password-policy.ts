export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 128;

// Count Unicode code points after NFC normalization, preserving spaces.
export function getPasswordPolicy(password: string) {
  const normalized = password.normalize('NFC');
  const length = [...normalized].length;
  return { checks: {
    length: length >= PASSWORD_MIN_LENGTH && length <= PASSWORD_MAX_LENGTH,
    characters: !/[\p{Cc}\p{Cs}]/u.test(normalized),
  } };
}

export function getPasswordPolicyError(password: string): string {
  const { checks } = getPasswordPolicy(password);
  if (!checks.length) return 'ใช้รหัสผ่านยาว 15–128 ตัวอักษร';
  if (!checks.characters) return 'รหัสผ่านต้องไม่มีอักขระควบคุมหรืออักขระที่ไม่สมบูรณ์';
  return '';
}

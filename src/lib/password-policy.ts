export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_UPPERCASE_PATTERN = /[A-Z]/;
export const PASSWORD_LOWERCASE_PATTERN = /[a-z]/;
export const PASSWORD_NUMBER_PATTERN = /[0-9]/;
export const PASSWORD_SPECIAL_PATTERN = /[!@#$%^&*(),.?":{}|<>]/;

export function getPasswordPolicy(password: string) {
  const checks = {
    length: password.length >= PASSWORD_MIN_LENGTH,
    uppercase: PASSWORD_UPPERCASE_PATTERN.test(password),
    lowercase: PASSWORD_LOWERCASE_PATTERN.test(password),
    number: PASSWORD_NUMBER_PATTERN.test(password),
    special: PASSWORD_SPECIAL_PATTERN.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;

  let label = 'อ่อนมาก';
  if (score >= 5) label = 'แข็งแกร่งมาก';
  else if (score >= 4) label = 'แข็งแกร่ง';
  else if (score >= 3) label = 'ปานกลาง';
  else if (score >= 2) label = 'อ่อน';

  return { checks, score, label, percentage: (score / 5) * 100 };
}

export function getPasswordPolicyError(password: string): string {
  const { checks } = getPasswordPolicy(password);
  if (!checks.length) return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
  if (!checks.uppercase) return 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว';
  if (!checks.lowercase) return 'รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว';
  if (!checks.number) return 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว';
  return '';
}

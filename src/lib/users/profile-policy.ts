export const PROFILE_NAME_MIN_LENGTH = 2;
export const PROFILE_NAME_MAX_LENGTH = 100;

export function getProfileNameError(name: string): string {
  const length = name.trim().length;
  if (length < PROFILE_NAME_MIN_LENGTH) return 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร';
  if (length > PROFILE_NAME_MAX_LENGTH) return 'ชื่อต้องไม่เกิน 100 ตัวอักษร';
  return '';
}

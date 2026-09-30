import { createHash } from 'node:crypto';
import { PasswordSecurityError } from './password-errors';

const BLOCKED_PASSWORDS = new Set([
  'passwordpassword', 'passwordpasswordpassword', '123456789012345',
  '12345678901234567890', 'milerdevmilerdev', 'milerdevmilerdev.com',
]);

// SHA-1 is only for this protocol. Stored verifiers use Argon2id.
export async function assertPasswordNotCompromised(password: string): Promise<void> {
  if (BLOCKED_PASSWORDS.has(password.toLowerCase())) {
    throw new PasswordSecurityError('compromised', 'รหัสผ่านนี้เดาง่ายหรือเกี่ยวข้องกับชื่อบริการ กรุณาเลือกรหัสผ่านอื่น');
  }
  const digest = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${digest.slice(0, 5)}`, {
      headers: { 'Add-Padding': 'true', 'User-Agent': 'MilerDev-Password-Screening' },
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'error',
    });
    if (!response.ok) throw new Error('Screening unavailable');
    const text = await response.text();
    // Invalid responses must not be mistaken for a clean password.
    if (!text.trim() || text.length > 1024 * 1024) throw new Error('Invalid screening response');
    let compromised = false;
    for (const line of text.trim().split(/\r?\n/)) {
      const match = /^([A-F0-9]{35}):([0-9]+)$/i.exec(line);
      if (!match) throw new Error('Invalid screening response');
      if (match[1].toUpperCase() === digest.slice(5) && Number(match[2]) > 0) compromised = true;
    }
    if (compromised) {
      throw new PasswordSecurityError('compromised', 'รหัสผ่านนี้พบในข้อมูลรั่วไหล กรุณาเลือกรหัสผ่านอื่น');
    }
  } catch (error) {
    if (error instanceof PasswordSecurityError) throw error;
    throw new PasswordSecurityError('screening_unavailable', 'ยังตรวจสอบความปลอดภัยของรหัสผ่านไม่ได้ กรุณาลองใหม่อีกครั้ง');
  } finally {
    clearTimeout(timeout);
  }
}

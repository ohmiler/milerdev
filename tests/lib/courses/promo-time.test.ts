import { describe, expect, it } from 'vitest';

import { fromThaiDateTimeInput, toThaiDateTimeInput } from '@/lib/courses/promo-time';
import { updateCourseSchema } from '@/lib/validations/admin';

describe('promotion times in Thai time', () => {
  it('shows a stored instant as Thai wall-clock time in the editor', () => {
    // Midnight 6 Oct in Bangkok is 17:00 on 5 Oct in UTC.
    expect(toThaiDateTimeInput('2026-10-05T17:00:00.000Z')).toBe('2026-10-06T00:00');
    expect(toThaiDateTimeInput(new Date('2026-10-16T16:59:00.000Z'))).toBe('2026-10-16T23:59');
  });

  it('reads what the admin typed as Thai time, whatever the browser time zone is', () => {
    expect(fromThaiDateTimeInput('2026-10-06T00:00')).toBe('2026-10-05T17:00:00.000Z');
    expect(fromThaiDateTimeInput('2026-10-06T00:00:30')).toBe('2026-10-05T17:00:30.000Z');
  });

  it('round-trips without drifting, so saving an untouched form keeps the promotion window', () => {
    const stored = '2026-10-10T03:30:00.000Z';
    expect(fromThaiDateTimeInput(toThaiDateTimeInput(stored))).toBe(stored);
  });

  it('treats empty as "no limit" and rejects malformed input', () => {
    expect(toThaiDateTimeInput(null)).toBe('');
    expect(toThaiDateTimeInput('not a date')).toBe('');
    expect(fromThaiDateTimeInput('')).toBe('');
    expect(fromThaiDateTimeInput('2026-10-06')).toBeNull();
    expect(fromThaiDateTimeInput('06/10/2026 00:00')).toBeNull();
  });
});

describe('course promotion time validation', () => {
  it('accepts instants with an offset, and empty or null to clear', () => {
    expect(updateCourseSchema.safeParse({ promoStartsAt: '2026-10-05T17:00:00.000Z', promoEndsAt: '2026-10-15T17:00:00.000Z' }).success).toBe(true);
    expect(updateCourseSchema.safeParse({ promoStartsAt: '2026-10-06T00:00:00+07:00' }).success).toBe(true);
    expect(updateCourseSchema.safeParse({ promoStartsAt: '', promoEndsAt: null }).success).toBe(true);
  });

  it('refuses a time without an offset instead of guessing the server time zone', () => {
    // A form loaded before this change still sends offset-less values; it is asked to reload.
    const result = updateCourseSchema.safeParse({ promoStartsAt: '2026-10-06T00:00' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ['promoStartsAt'],
      message: 'เวลาโปรโมชั่นไม่ถูกต้อง กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง',
    });
  });

  it('refuses a promotion that ends before it starts', () => {
    const result = updateCourseSchema.safeParse({ promoStartsAt: '2026-10-10T00:00:00.000Z', promoEndsAt: '2026-10-09T00:00:00.000Z' });
    expect(result.error?.issues[0]).toMatchObject({ path: ['promoEndsAt'], message: 'เวลาสิ้นสุดโปรโมชั่นต้องอยู่หลังเวลาเริ่มต้น' });
  });
});

import { describe, expect, it } from 'vitest';

import {
  ACCOUNT_NAVIGATION,
  GUEST_NAVIGATION,
  MEMBER_UTILITY_NAVIGATION,
  PUBLIC_NAVIGATION,
  getNavigationState,
} from '@/lib/navigation-model';

describe('canonical navigation model', () => {
  it('owns the public, guest, account, and member destinations and labels', () => {
    expect(PUBLIC_NAVIGATION.map(({ href, label }) => ({ href, label }))).toEqual([
      { href: '/courses', label: 'คอร์สทั้งหมด' },
      { href: '/blog', label: 'บทความ' },
      { href: '/about', label: 'เกี่ยวกับเรา' },
      { href: '/contact', label: 'ติดต่อ' },
    ]);
    expect(GUEST_NAVIGATION.map(({ href, label }) => ({ href, label }))).toEqual([
      { href: '/login', label: 'เข้าสู่ระบบ' },
      { href: '/register', label: 'สมัครสมาชิก' },
    ]);
    expect(ACCOUNT_NAVIGATION.map(({ href, label }) => ({ href, label }))).toEqual([
      { href: '/dashboard', label: 'การเรียนของฉัน' },
      { href: '/dashboard/payments', label: 'การชำระเงิน' },
      { href: '/dashboard/certificates', label: 'ใบรับรอง' },
      { href: '/profile', label: 'โปรไฟล์' },
      { href: '/settings', label: 'ตั้งค่าบัญชี' },
    ]);
    expect(MEMBER_UTILITY_NAVIGATION).toEqual([
      expect.objectContaining({ href: '/announcements', label: 'ประกาศ' }),
    ]);
  });

  it('distinguishes an exact page from a nested section without prefix collisions', () => {
    const dashboard = ACCOUNT_NAVIGATION.find((item) => item.key === 'dashboard')!;
    const payments = ACCOUNT_NAVIGATION.find((item) => item.key === 'payments')!;
    const courses = PUBLIC_NAVIGATION.find((item) => item.key === 'courses')!;
    const blog = PUBLIC_NAVIGATION.find((item) => item.key === 'blog')!;

    expect(getNavigationState('/dashboard/payments', dashboard)).toEqual({
      active: false,
      ariaCurrent: undefined,
    });
    expect(getNavigationState('/dashboard/payments', payments)).toEqual({
      active: true,
      ariaCurrent: 'page',
    });
    expect(getNavigationState('/courses/typescript/', courses)).toEqual({
      active: true,
      ariaCurrent: 'location',
    });
    expect(getNavigationState('/blogger', blog)).toEqual({
      active: false,
      ariaCurrent: undefined,
    });
  });
});

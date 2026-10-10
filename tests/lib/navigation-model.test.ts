import { describe, expect, it } from 'vitest';

import {
  ACCOUNT_NAVIGATION,
  GUEST_NAVIGATION,
  PUBLIC_NAVIGATION,
  getNavigationState,
} from '@/lib/navigation-model';

describe('canonical navigation model', () => {
  it('owns the public, guest, and account destinations and labels', () => {
    expect(PUBLIC_NAVIGATION.map(({ href, label }) => ({ href, label }))).toEqual([
      { href: '/courses', label: 'คอร์สทั้งหมด' },
      { href: '/handbook', label: 'คู่มือ Dev ยุค AI' },
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
      { href: '/profile', label: 'บัญชีของฉัน' },
    ]);
  });

  it('distinguishes an exact page from a nested section without prefix collisions', () => {
    const dashboard = ACCOUNT_NAVIGATION.find((item) => item.key === 'dashboard')!;
    const payments = ACCOUNT_NAVIGATION.find((item) => item.key === 'payments')!;
    const courses = PUBLIC_NAVIGATION.find((item) => item.key === 'courses')!;

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
    expect(getNavigationState('/courses-archive', courses)).toEqual({
      active: false,
      ariaCurrent: undefined,
    });
  });
});

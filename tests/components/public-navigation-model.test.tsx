// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigationMocks = vi.hoisted(() => ({
  pathname: '/',
  sessionResult: {
    data: null as null | {
      user: { id: string; name: string; email: string; role: string };
      expires: string;
    },
    status: 'unauthenticated' as 'loading' | 'authenticated' | 'unauthenticated',
  },
}));

vi.mock('next/navigation', () => ({ usePathname: () => navigationMocks.pathname }));
vi.mock('next-auth/react', () => ({ useSession: () => navigationMocks.sessionResult }));
vi.mock('@/components/notifications/NotificationProvider', () => ({
  useNotifications: () => ({
    unreadCount: 0,
    notifications: [],
    markAsRead: vi.fn().mockResolvedValue(undefined),
    deleteRead: vi.fn().mockResolvedValue(undefined),
    setNotificationsPanelOpen: vi.fn(),
  }),
}));

import PublicNavigationBar from '@/components/layout/PublicNavigationBar';

function renderNavigation() {
  return render(
    <>
      <PublicNavigationBar onRequestLogout={vi.fn()} />
      <main id="main-content" tabIndex={-1}>เนื้อหาหลัก</main>
    </>,
  );
}

describe('public navigation model adapters', () => {
  beforeEach(() => {
    navigationMocks.pathname = '/';
    navigationMocks.sessionResult.data = null;
    navigationMocks.sessionResult.status = 'unauthenticated';
  });

  afterEach(() => {
    cleanup();
  });

  it('supports keyboard skip-to-main and returns focus after closing the mobile Sheet', async () => {
    const user = userEvent.setup();
    renderNavigation();

    await user.tab();
    const skipLink = screen.getByRole('link', { name: 'ข้ามไปเนื้อหาหลัก' });
    expect(document.activeElement).toBe(skipLink);
    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(screen.getByRole('main'));

    const trigger = screen.getByRole('button', { name: 'เปิดเมนูหลัก' });
    await user.click(trigger);
    expect(await screen.findByRole('dialog')).toBeTruthy();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('keeps mobile loading distinct from guest actions', async () => {
    navigationMocks.sessionResult.status = 'loading';
    const user = userEvent.setup();
    renderNavigation();

    await user.click(screen.getByRole('button', { name: 'เปิดเมนูหลัก' }));
    expect(await screen.findByLabelText('กำลังโหลดเมนูบัญชี')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'เข้าสู่ระบบ' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'สมัครสมาชิก' })).toBeNull();
  });

  it('uses exact account active state in the authenticated mobile menu', async () => {
    navigationMocks.pathname = '/dashboard/payments';
    navigationMocks.sessionResult.status = 'authenticated';
    navigationMocks.sessionResult.data = {
      user: { id: 'learner-1', name: 'Learner', email: 'learner@example.com', role: 'user' },
      expires: '2099-01-01T00:00:00.000Z',
    };
    const user = userEvent.setup();
    renderNavigation();

    await user.click(screen.getByRole('button', { name: 'เปิดเมนูหลัก' }));
    expect((await screen.findByRole('link', { name: 'การชำระเงิน' })).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'การเรียนของฉัน' }).hasAttribute('aria-current')).toBe(false);
    expect(screen.getByRole('link', { name: 'ใบรับรอง' }).hasAttribute('aria-current')).toBe(false);
    const accountNavigation = screen.getByRole('navigation', { name: 'เมนูบัญชีสมาชิก' });
    expect(within(accountNavigation).queryByRole('link', { name: 'ประกาศ' })).toBeNull();
    const memberNavigation = screen.getByRole('navigation', { name: 'เมนูสมาชิก' });
    expect(within(memberNavigation).getByRole('link', { name: 'ประกาศ' })).toBe(
      screen.getByRole('link', { name: 'ประกาศ' }),
    );
  });

  it('shows a desktop section cue for nested public routes', () => {
    navigationMocks.pathname = '/courses/typescript-foundations';
    renderNavigation();

    const coursesLink = screen.getAllByRole('link', { name: 'คอร์สทั้งหมด' })[0];
    expect(coursesLink.getAttribute('aria-current')).toBe('location');
    expect(coursesLink.className).toContain('aria-[current=location]:bg-secondary');
  });
});

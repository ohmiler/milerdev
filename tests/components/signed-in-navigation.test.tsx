// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'member-1', name: 'Miler', email: 'miler@example.test', role: 'student' }, expires: '2099-01-01' },
    status: 'authenticated',
  }),
}));

import ContinueLearningBar from '@/components/home/ContinueLearningBar';
import PublicNavigationBar from '@/components/layout/PublicNavigationBar';

afterEach(cleanup);

describe('navigation for a signed-in member', () => {
  it("puts the member's learning one click away on desktop", () => {
    render(<PublicNavigationBar onRequestLogout={vi.fn()} />);

    const desktop = screen.getAllByRole('link', { name: 'การเรียนของฉัน' })[0];
    expect(desktop.getAttribute('href')).toBe('/dashboard');
  });

  it("lists the member's own pages first on mobile and keeps sign-out quiet", async () => {
    const user = userEvent.setup();
    render(<PublicNavigationBar onRequestLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'เปิดเมนูหลัก' }));
    const dialog = await screen.findByRole('dialog');
    const navs = within(dialog).getAllByRole('navigation').map((nav) => nav.getAttribute('aria-label'));
    expect(navs.indexOf('เมนูบัญชีสมาชิก')).toBeLessThan(navs.indexOf('ลิงก์หลัก'));
    expect(within(dialog).getByRole('button', { name: 'ออกจากระบบ' }).getAttribute('data-variant')).toBe('ghost');
  });
});

describe('Home continue bar', () => {
  const learning = {
    course: { title: 'HTML CSS Masterful', slug: 'html-css-masterful', thumbnailUrl: null },
    lesson: { title: 'Flexbox คืออะไร', position: 51 },
    progress: { completedLessons: 50, totalLessons: 92, percent: 54 },
    href: '/courses/html-css-masterful/learn',
  };

  it('names the lesson to pick up and links straight to it', () => {
    render(<ContinueLearningBar learning={{ ...learning, continuation: 'resume' }} />);

    expect(screen.getByRole('region', { name: 'เรียนต่อจากครั้งก่อน' })).toBeTruthy();
    expect(screen.getByText('บทที่ 51 · Flexbox คืออะไร')).toBeTruthy();
    expect(screen.getByText('54%')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'เรียนต่อ' }).getAttribute('href')).toBe('/courses/html-css-masterful/learn');
  });

  it('says start for a course with no lessons watched yet', () => {
    render(<ContinueLearningBar learning={{ ...learning, continuation: 'start' }} />);

    expect(screen.getByRole('link', { name: 'เริ่มเรียน' })).toBeTruthy();
  });
});

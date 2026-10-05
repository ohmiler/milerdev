// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/lib/courses/admin-lifecycle-client', () => ({ transitionAdminCourse: vi.fn() }));
vi.mock('@/components/ui/Toast', () => ({ showToast: vi.fn() }));

import AdminCoursesTable, { type Course } from '@/components/admin/AdminCoursesTable';

const course = (overrides: Partial<Course>): Course => ({
  id: 'course-1',
  title: 'React ที่ใช้ได้จริง',
  slug: 'react',
  description: null,
  price: '990.00',
  promoPrice: null,
  promoStartsAt: null,
  promoEndsAt: null,
  status: 'published',
  thumbnailUrl: 'https://cdn.example.test/react.jpg',
  createdAt: '2026-09-01T00:00:00.000Z',
  lessonCount: 8,
  enrollmentCount: 12,
  ...overrides,
});

// The desktop table and the phone cards render the same row; the table is enough here.
const tableRow = () => within(screen.getAllByRole('table')[0]).getAllByRole('row')[1];

describe('AdminCoursesTable row actions', () => {
  beforeEach(() => {
    // Radix menus measure and observe elements that jsdom does not lay out.
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows one primary step and keeps the rest, including status changes, in one menu', async () => {
    const user = userEvent.setup();
    render(<AdminCoursesTable courses={[course({})]} />);
    const row = tableRow();

    expect(within(row).getByRole('link', { name: 'React ที่ใช้ได้จริง' }).getAttribute('href')).toBe('/admin/courses/course-1/edit');
    expect(within(row).getByRole('link', { name: 'จัดบทเรียน' }).getAttribute('href')).toBe('/admin/courses/course-1/lessons');
    expect(within(row).queryByRole('button', { name: 'เก็บเข้าคลัง' })).toBeNull();
    expect(within(row).queryByRole('link', { name: 'แก้ไข' })).toBeNull();

    within(row).getByRole('button', { name: 'จัดการเพิ่มเติม: React ที่ใช้ได้จริง' }).focus();
    await user.keyboard('{Enter}');
    const menu = await screen.findByRole('menu');

    expect(within(menu).getByRole('menuitem', { name: 'แก้ไขรายละเอียดคอร์ส' }).getAttribute('href')).toBe('/admin/courses/course-1/edit');
    expect(within(menu).getByRole('menuitem', { name: 'ผู้เรียนในคอร์สนี้' }).getAttribute('href')).toBe('/admin/courses/course-1/enrollments');
    expect(within(menu).getByRole('menuitem', { name: 'ดูหน้าเว็บ' }).getAttribute('target')).toBe('_blank');
    // The primary step is not repeated in the menu.
    expect(within(menu).queryByRole('menuitem', { name: 'จัดบทเรียน' })).toBeNull();
    expect(within(menu).getByRole('menuitem', { name: 'เก็บเข้าคลัง' }).getAttribute('data-variant')).toBe('destructive');
  });

  it('asks for confirmation before a status change chosen from the menu', async () => {
    const user = userEvent.setup();
    render(<AdminCoursesTable courses={[course({})]} />);

    within(tableRow()).getByRole('button', { name: 'จัดการเพิ่มเติม: React ที่ใช้ได้จริง' }).focus();
    await user.keyboard('{Enter}');
    await user.click(within(await screen.findByRole('menu')).getByRole('menuitem', { name: 'เก็บเข้าคลัง' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('เก็บคอร์สเข้าคลัง')).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'ยืนยันเก็บเข้าคลัง' })).toBeTruthy();
  });

  it('only offers transitions that are valid for the course status', async () => {
    const user = userEvent.setup();
    render(<AdminCoursesTable courses={[course({ status: 'archived' })]} />);

    within(tableRow()).getByRole('button', { name: 'จัดการเพิ่มเติม: React ที่ใช้ได้จริง' }).focus();
    await user.keyboard('{Enter}');
    const menu = await screen.findByRole('menu');

    expect(within(menu).getByRole('menuitem', { name: 'นำกลับเป็นแบบร่าง' })).toBeTruthy();
    expect(within(menu).queryByRole('menuitem', { name: 'เก็บเข้าคลัง' })).toBeNull();
    expect(within(menu).queryByRole('menuitem', { name: 'ดูหน้าเว็บ' })).toBeNull();
  });
});

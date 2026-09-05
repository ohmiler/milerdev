// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import EnrollButton from '@/components/course/EnrollButton';

const mocks = vi.hoisted(() => ({ push: vi.fn(), member: true }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: mocks.member ? { user: { id: 'member-1' } } : null, status: mocks.member ? 'authenticated' : 'unauthenticated' }) }));
vi.mock('@/components/analytics/analytics-client', () => ({ trackClientAnalyticsEvent: vi.fn() }));
const response = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;
beforeEach(() => { vi.clearAllMocks(); mocks.member = true; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('preserves the exact Course destination when a visitor starts checkout', async () => {
  mocks.member = false;
  const user = userEvent.setup();
  render(<EnrollButton courseId="course-1" courseSlug="typescript" price={2490} />);
  await user.click(await screen.findByRole('button', { name: /ซื้อคอร์สนี้/ }));
  expect(mocks.push).toHaveBeenCalledWith('/login?callbackUrl=/courses/typescript');
});

it('keeps free enrollment server-authoritative and updates the learning action after success', async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce(response({ enrolled: false })).mockResolvedValueOnce(response({ success: true }));
  vi.stubGlobal('fetch', fetchMock);
  const user = userEvent.setup(); const changed = vi.fn();
  render(<EnrollButton courseId="course-1" courseSlug="typescript" price={0} onEnrollmentChange={changed} />);
  await user.click(await screen.findByRole('button', { name: 'ลงทะเบียนเรียนฟรี' }));
  await user.click(await screen.findByRole('button', { name: 'เข้าเรียน' }));
  expect(fetchMock).toHaveBeenLastCalledWith('/api/enrollments', expect.objectContaining({ body: JSON.stringify({ courseId: 'course-1' }) }));
  expect(changed).toHaveBeenLastCalledWith(true);
  expect(mocks.push).toHaveBeenCalledWith('/courses/typescript/learn');
});

it('shows a server rejection without granting course access', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({ enrolled: false })).mockResolvedValueOnce(response({ error: 'ยังลงทะเบียนไม่ได้' }, false)));
  const user = userEvent.setup();
  render(<EnrollButton courseId="course-1" courseSlug="typescript" price={0} />);
  await user.click(await screen.findByRole('button', { name: 'ลงทะเบียนเรียนฟรี' }));
  expect(await screen.findByText('ยังลงทะเบียนไม่ได้')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'เข้าเรียน' })).toBeNull();
});

it('opens the shared authoritative order review for a paid Course', async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce(response({ enrolled: false })).mockResolvedValueOnce(response({ review: {
    target: { type: 'course', id: 'course-1', title: 'คอร์สจาก server', href: '/courses/typescript' },
    price: { original: '990.25', discount: '0.00', amountDue: '990.25', currency: 'THB' },
    coupon: null, comparison: null, access: { ownedCount: 0, totalCount: 1, description: 'ยืนยันแล้วจึงมีสิทธิ์เรียน' }, action: 'pay',
  } }));
  vi.stubGlobal('fetch', fetchMock);
  const user = userEvent.setup();
  render(<EnrollButton courseId="course-1" courseSlug="typescript" price={2490} />);
  await user.click(await screen.findByRole('button', { name: /ซื้อคอร์สนี้/ }));
  expect(await screen.findByText('คอร์สจาก server')).toBeTruthy();
  expect(screen.getAllByText('฿990.25')).toHaveLength(2);
  expect(fetchMock).toHaveBeenLastCalledWith('/api/checkout/review', expect.objectContaining({ body: JSON.stringify({ courseId: 'course-1' }) }));
});

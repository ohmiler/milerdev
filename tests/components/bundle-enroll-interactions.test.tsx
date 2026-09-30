// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import BundleEnrollButton from '@/components/bundle/BundleEnrollButton';
import { deriveBundleDecisionFacts } from '@/lib/bundle-decision-facts';

const mocks = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), member: true }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: mocks.member ? { user: { id: 'member-1' } } : null }) }));
vi.mock('@/components/analytics/analytics-client', () => ({ trackClientAnalyticsEvent: vi.fn() }));
const facts = (price = 2490) => deriveBundleDecisionFacts({ slug: 'full-stack', price, courses: [{ id: 'course-1', title: 'TypeScript', slug: 'typescript', orderIndex: 0, regularPrice: 3500, lessonCount: 1 }] }, { now: new Date() });
const response = (body: unknown) => ({ ok: true, json: async () => body }) as Response;
beforeEach(() => { vi.clearAllMocks(); mocks.member = true; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('preserves the exact Bundle destination when a visitor starts checkout', async () => {
  mocks.member = false;
  const user = userEvent.setup();
  render(<BundleEnrollButton bundleId="bundle-1" bundleSlug="full-stack" decisionFacts={facts()} />);
  await user.click(screen.getByRole('button', { name: /ซื้อ Bundle/ }));
  expect(mocks.push).toHaveBeenCalledWith('/login?callbackUrl=/bundles/full-stack');
});

it('grants the Bundle learning action after explicit server-confirmed free enrollment', async () => {
  const fetchMock = vi.fn().mockResolvedValue(response({ success: true, totalEnrolled: 1 }));
  vi.stubGlobal('fetch', fetchMock);
  const user = userEvent.setup();
  render(<BundleEnrollButton bundleId="bundle-1" bundleSlug="full-stack" decisionFacts={facts(0)} />);
  await user.click(screen.getByRole('button', { name: 'ลงทะเบียน Bundle ฟรี' }));
  expect(await screen.findByRole('link', { name: 'ไปการเรียนของฉัน' })).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledWith('/api/bundles/enroll', expect.objectContaining({ body: JSON.stringify({ bundleId: 'bundle-1' }) }));
  expect(mocks.refresh).toHaveBeenCalled();
});

it('reviews the server-derived Bundle comparison before choosing a payment method', async () => {
  const fetchMock = vi.fn().mockResolvedValue(response({ review: {
    target: { type: 'bundle', id: 'bundle-1', title: 'Bundle จาก server', href: '/bundles/full-stack' },
    price: { original: '2490.00', discount: '0.00', amountDue: '2490.00', currency: 'THB' },
    coupon: null, comparison: { separate: '3500.00', label: 'ประหยัด ฿1,010 (29%)' },
    access: { ownedCount: 0, totalCount: 1, description: 'ยืนยันแล้วจึงมีสิทธิ์เรียน' }, action: 'pay',
  } }));
  vi.stubGlobal('fetch', fetchMock);
  const user = userEvent.setup();
  render(<BundleEnrollButton bundleId="bundle-1" bundleSlug="full-stack" decisionFacts={facts()} />);
  await user.click(screen.getByRole('button', { name: /ซื้อ Bundle/ }));
  expect(await screen.findByText('Bundle จาก server')).toBeTruthy();
  expect(screen.getByText('฿3,500.00')).toBeTruthy();
  expect(screen.getByText('ประหยัด ฿1,010 (29%)')).toBeTruthy();
  expect(screen.queryByRole('textbox', { name: 'มีโค้ดส่วนลด?' })).toBeNull();
});

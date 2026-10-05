// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'learner-1' }), useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/components/ui/Toast', () => ({ showToast: vi.fn() }));

import AdminUserDetailPage from '@/app/admin/users/[id]/page';

const section = (title: string) => screen.getByRole('heading', { level: 2, name: title }).closest('[data-slot="card"]') as HTMLElement;
const enrollmentRow = (course: string) => within(section('คอร์สที่ลงทะเบียน')).getByText(course).closest('tr') as HTMLElement;

const json = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body }) as Response;

const learner = {
  user: { id: 'learner-1', name: 'ผู้เรียนหนึ่ง', email: 'one@example.test', role: 'student', createdAt: '2026-09-01T00:00:00.000Z', lifecycleStatus: 'active', deactivatedAt: null },
  enrollments: [
    { id: 'e-1', courseId: 'react', enrolledAt: '2026-09-02T00:00:00.000Z', progressPercent: 100, completedAt: '2026-09-20T00:00:00.000Z', courseTitle: 'React', courseSlug: 'react', coursePrice: '990.00', courseImage: null },
    { id: 'e-2', courseId: 'css', enrolledAt: '2026-09-03T00:00:00.000Z', progressPercent: 100, completedAt: '2026-09-21T00:00:00.000Z', courseTitle: 'CSS', courseSlug: 'css', coursePrice: '0.00', courseImage: null },
  ],
  availableCourses: [],
};

function stubApi(history: 'ok' | 'fail') {
  const fetchMock = vi.fn(async (url: string) => {
    if (url === '/api/admin/users/learner-1/enrollments') return json(learner);
    if (history === 'fail') return json({ error: 'down' }, 500);
    if (url.startsWith('/api/admin/payments?userId=learner-1')) {
      return json({ payments: [{ id: 'pay-1', amount: '990.00', method: 'promptpay', status: 'completed', createdAt: '2026-09-02T00:00:00.000Z', itemTitle: 'React', courseTitle: 'React', bundleTitle: null }] });
    }
    if (url === '/api/admin/certificates?userId=learner-1') {
      return json({ certificates: [{ id: 'c-1', certificateCode: 'MD-REACT-1', courseId: 'react', courseTitle: 'React', issuedAt: '2026-09-20T00:00:00.000Z', revokedAt: null }] });
    }
    throw new Error(`unexpected ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('admin learner detail', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("shows the learner's payments and certificates and flags a finished course without one", async () => {
    stubApi('ok');
    render(<AdminUserDetailPage />);

    expect(await screen.findByText('pay-1')).toBeTruthy();
    const payments = section('ประวัติการชำระเงิน');
    expect(within(payments).getByText('pay-1')).toBeTruthy();
    expect(within(payments).getByText('พร้อมเพย์')).toBeTruthy();

    const certificates = section('ใบรับรอง');
    expect(within(certificates).getByText('MD-REACT-1')).toBeTruthy();
    expect(within(certificates).getByRole('link', { name: 'เปิดหน้าใบรับรอง MD-REACT-1' }).getAttribute('href')).toBe('/certificate/MD-REACT-1');

    // React has an active certificate; CSS is finished but has none.
    expect(within(enrollmentRow('CSS')).getByText('ยังไม่มีใบรับรอง')).toBeTruthy();
    expect(within(enrollmentRow('React')).queryByText('ยังไม่มีใบรับรอง')).toBeNull();
  });

  it('keeps the enrollments usable when the history cannot load', async () => {
    stubApi('fail');
    render(<AdminUserDetailPage />);

    expect(await screen.findByText('โหลดประวัติการชำระเงินและใบรับรองไม่สำเร็จ')).toBeTruthy();
    expect(enrollmentRow('CSS')).toBeTruthy();
    // Without certificate data the page does not guess that one is missing.
    expect(screen.queryByText('ยังไม่มีใบรับรอง')).toBeNull();
  });
});

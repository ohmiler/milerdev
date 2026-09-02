import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDashboardLearning, requireMember } = vi.hoisted(() => ({
  getDashboardLearning: vi.fn(),
  requireMember: vi.fn(),
}));

vi.mock('@/lib/member-access', () => ({ requireMember }));
vi.mock('@/lib/dashboard-learning', () => ({ getDashboardLearning }));
vi.mock('@/components/layout/Navbar', () => ({
  default: () => <div data-layout="navbar" />,
}));
vi.mock('@/components/layout/Footer', () => ({
  default: () => <div data-layout="footer" />,
}));

import DashboardPage from '@/app/dashboard/page';

describe('DashboardPage member access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('authorizes the exact route before starting a private read', async () => {
    requireMember.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));

    await expect(DashboardPage()).rejects.toThrow('NEXT_REDIRECT');

    expect(requireMember).toHaveBeenCalledWith('/dashboard');
    expect(getDashboardLearning).not.toHaveBeenCalled();
  });

  it('renders the next action before summary metrics from the minimal projection', async () => {
    requireMember.mockResolvedValueOnce({ id: 'member-1', name: 'ไมเลอร์' });
    getDashboardLearning.mockResolvedValueOnce({
      summary: {
        courseCount: 1,
        activeCourseCount: 1,
        completedCourseCount: 0,
        activeCertificateCount: 0,
        paymentCount: 2,
      },
      primary: {
        enrollment: 'active',
        course: {
          id: 'course-1',
          title: 'TypeScript ที่ใช้ได้จริง',
          slug: 'typescript',
          thumbnailUrl: null,
        },
        progress: { completedLessons: 1, totalLessons: 4, percent: 25 },
        continuation: 'resume',
        certificate: 'not_eligible',
        status: {
          label: 'กำลังเรียน · 1/4 บท',
          description: 'เรียนจบแล้ว 1 จาก 4 บท สามารถกลับมาเรียนต่อได้',
        },
        action: {
          kind: 'resume',
          label: 'เรียนต่อ: Generics',
          href: '/courses/typescript/learn',
        },
      },
      remaining: [],
    });

    const html = renderToStaticMarkup(await DashboardPage());

    expect(getDashboardLearning).toHaveBeenCalledWith('member-1');
    expect(html).toContain('สวัสดี, ไมเลอร์');
    expect(html).toContain('เรียนต่อ: Generics');
    expect(html.indexOf('สิ่งที่ควรทำต่อ')).toBeLessThan(html.indexOf('สรุปการเรียน'));
    expect(html).not.toContain('member-1');
  });
});

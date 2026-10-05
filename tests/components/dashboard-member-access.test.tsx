import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDashboardLearning, requireMember } = vi.hoisted(() => ({
  getDashboardLearning: vi.fn(),
  requireMember: vi.fn(),
}));

vi.mock('@/lib/auth/member-access', () => ({ requireMember }));
vi.mock('@/lib/learning/dashboard', () => ({ getDashboardLearning }));
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

  it('shows a newcomer where to start instead of a row of zero counts', async () => {
    requireMember.mockResolvedValueOnce({ id: 'member-1', name: 'ไมเลอร์' });
    getDashboardLearning.mockResolvedValueOnce({
      summary: { courseCount: 0, activeCourseCount: 0, completedCourseCount: 0, activeCertificateCount: 0, paymentCount: 0 },
      primary: {
        enrollment: 'none', course: null, progress: { completedLessons: 0, totalLessons: 0, percent: 0 },
        continuation: 'none', certificate: 'not_eligible',
        status: { label: 'ยังไม่มีคอร์สในการเรียนของฉัน', description: 'เลือกคอร์สที่สนใจเพื่อเริ่มเรียน' },
        action: { kind: 'browse', label: 'ดูคอร์สทั้งหมด', href: '/courses' },
      },
      remaining: [],
    });

    const html = renderToStaticMarkup(await DashboardPage());

    expect(html).not.toContain('สรุปการเรียน');
    expect(html).not.toContain('กลับมาเรียนต่อ');
    expect(html).toContain('href="/courses?preview=free"');
  });

  it('lets a finished course be reviewed and reads each other course once', async () => {
    const completed = (slug: string, title: string) => ({
      enrollment: 'completed', course: { id: slug, title, slug, thumbnailUrl: null },
      progress: { completedLessons: 3, totalLessons: 3, percent: 100 }, continuation: 'review', certificate: 'active',
      status: { label: 'เรียนจบแล้ว · ใบรับรองพร้อม', description: 'จบแล้ว' },
      action: { kind: 'view-certificates', label: 'ดูและแชร์ใบรับรอง', href: '/dashboard/certificates' },
    });
    requireMember.mockResolvedValueOnce({ id: 'member-1', name: 'ไมเลอร์' });
    getDashboardLearning.mockResolvedValueOnce({
      summary: { courseCount: 3, activeCourseCount: 1, completedCourseCount: 2, activeCertificateCount: 2, paymentCount: 3 },
      primary: completed('react', 'React'),
      remaining: [
        completed('css', 'CSS'),
        {
          enrollment: 'active', course: { id: 'ts', title: 'TypeScript', slug: 'ts', thumbnailUrl: null },
          progress: { completedLessons: 1, totalLessons: 4, percent: 25 }, continuation: 'resume', certificate: 'not_eligible',
          status: { label: 'กำลังเรียน · 1/4 บท', description: '' },
          action: { kind: 'resume', label: 'เรียนต่อ: Generics', href: '/courses/ts/learn' },
        },
      ],
    });

    const html = renderToStaticMarkup(await DashboardPage());

    expect(html).toContain('href="/courses/react/learn"');
    expect(html).toContain('href="/courses/css/learn"');
    expect(html.match(/ทบทวนบทเรียน/g)).toHaveLength(2);
    // The unfinished course shows its percentage once; finished courses show no empty bar.
    expect(html.match(/ความคืบหน้า 25%/g)).toHaveLength(1);
    expect(html.match(/>25%</g)).toHaveLength(1);
    expect(html).not.toContain('ความคืบหน้า 100%');
  });
});

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import DashboardLoading from '@/app/dashboard/loading';
import ErrorPage from '@/app/error';
import NotFound from '@/app/not-found';

vi.mock('@/components/layout/Navbar', () => ({
  default: () => <nav aria-label="Mock public navigation" />,
}));

vi.mock('@/components/layout/Footer', () => ({
  default: () => <footer>Mock public footer</footer>,
}));

describe('learner status surfaces', () => {
  it('keeps 404 orientation and safe recovery routes', () => {
    const html = renderToStaticMarkup(<NotFound />);

    expect(html).toContain('<h1');
    expect(html).toContain('ไม่พบหน้าที่คุณต้องการ');
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/courses"');
    expect(html).toContain('Mock public navigation');
    expect(html).toContain('Mock public footer');
  });

  it('keeps retry and home recovery without exposing error details', () => {
    const html = renderToStaticMarkup(
      <ErrorPage error={new Error('private database detail')} reset={vi.fn()} />,
    );

    expect(html).toContain('ลองใหม่อีกครั้ง');
    expect(html).toContain('href="/"');
    expect(html).not.toContain('private database detail');
  });

  it('describes dashboard loading with the current learner anatomy', () => {
    const html = renderToStaticMarkup(<DashboardLoading />);

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('กำลังโหลดแดชบอร์ดการเรียน');
    expect(html).toContain('data-dashboard-loading="header"');
    expect(html).toContain('data-dashboard-loading="account-navigation"');
    expect(html.match(/data-dashboard-loading-stat="true"/g)).toHaveLength(4);
    expect(html).toContain('data-dashboard-loading="continuation"');
    expect(html).toContain('data-dashboard-loading="course-index"');
  });
});

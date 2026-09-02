import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import LearningNavbar from '@/components/course/LearningNavbar';
import MainContent from '@/components/layout/MainContent';
import NavigationBreadcrumbs from '@/components/layout/NavigationBreadcrumbs';

describe('canonical navigation shell contracts', () => {
  it('renders one shared semantic breadcrumb interface', () => {
    const html = renderToStaticMarkup(
      <NavigationBreadcrumbs
        items={[
          { href: '/', label: 'หน้าแรก' },
          { href: '/dashboard', label: 'บัญชีสมาชิก' },
          { label: 'การชำระเงิน' },
        ]}
      />,
    );

    expect(html).toContain('aria-label="เส้นทางนำทาง"');
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('การชำระเงิน');
  });

  it('provides the shared focusable target used by public and learning skip links', () => {
    const html = renderToStaticMarkup(<MainContent>เนื้อหาหลัก</MainContent>);

    expect(html).toContain('<main');
    expect(html).toContain('id="main-content"');
    expect(html).toContain('tabindex="-1"');
  });

  it('keeps exactly one course-exit destination in the learning header', () => {
    const html = renderToStaticMarkup(
      <LearningNavbar
        courseSlug="sample-course"
        courseTitle="Sample course"
        lessonTitle="Sample lesson"
        currentIndex={0}
        totalCount={2}
        progressPercent={0}
        isEnrolled
        sidebarCollapsed={false}
        onToggleSidebar={vi.fn()}
        onOpenSidebar={vi.fn()}
      />,
    );

    expect(html.match(new RegExp('href="/courses/sample-course"', 'g'))).toHaveLength(1);
    expect(html.match(/data-learning-control="course-exit"/g)).toHaveLength(1);
  });
});

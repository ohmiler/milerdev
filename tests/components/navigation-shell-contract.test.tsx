import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import NavigationBreadcrumbs from '@/components/layout/NavigationBreadcrumbs';

describe('canonical navigation shell contracts', () => {
  it('renders one shared semantic breadcrumb interface', () => {
    const html = renderToStaticMarkup(
      <NavigationBreadcrumbs
        items={[
          { href: '/', label: 'หน้าแรก' },
          { href: '/dashboard', label: 'บัญชีผู้เรียน' },
          { label: 'การชำระเงิน' },
        ]}
      />,
    );

    expect(html).toContain('aria-label="เส้นทางนำทาง"');
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('การชำระเงิน');
  });

  it('gives every public and learning shell a focusable main target', () => {
    const files = [
      'src/components/account/LearnerAccountShell.tsx',
      'src/components/auth/AuthShell.tsx',
      'src/components/proof/TransactionReceipt.tsx',
      'src/components/status/StatusSurface.tsx',
      'src/components/ui/RouteSkeletons.tsx',
      'src/app/about/page.tsx',
      'src/app/announcements/page.tsx',
      'src/app/blog/[slug]/page.tsx',
      'src/app/blog/page.tsx',
      'src/app/bundles/[slug]/page.tsx',
      'src/app/certificate/[code]/page.tsx',
      'src/app/contact/page.tsx',
      'src/app/courses/[slug]/loading.tsx',
      'src/app/courses/[slug]/page.tsx',
      'src/app/courses/page.tsx',
      'src/app/faq/page.tsx',
      'src/app/page.tsx',
      'src/app/privacy/page.tsx',
      'src/app/terms/page.tsx',
      'src/components/course/LearnPageClient.tsx',
      'src/app/courses/[slug]/learn/[lessonId]/loading.tsx',
      'src/app/courses/[slug]/learn/EmptyCourseWorkspace.tsx',
    ];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      const mainCount = source.match(/<main\b/g)?.length ?? 0;
      expect(mainCount, file).toBeGreaterThan(0);
      expect(source.match(/id="main-content"/g)?.length ?? 0, file).toBe(mainCount);
      expect(source.match(/tabIndex=\{-1\}/g)?.length ?? 0, file).toBe(mainCount);
    }
  });

  it('keeps exactly one course-exit destination in the learning header', () => {
    const source = readFileSync('src/components/course/LearningNavbar.tsx', 'utf8');
    expect(source.match(/href=\{`\/courses\/\$\{courseSlug\}`\}/g)).toHaveLength(1);
    expect(source.match(/data-learning-control="course-exit"/g)).toHaveLength(1);
  });
});

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import AdminDashboardView, { type AdminDashboardData } from '@/app/admin/AdminDashboardView';
import {
  filterAdminCourses,
  getCourseHealth,
  getCoursePrimaryAction,
  isCoursePromoActive,
  type Course,
} from '@/components/admin/AdminCoursesTable';
import {
  adminAllLinks,
  getAdminNavTitle,
  isAdminNavActive,
} from '@/components/admin/adminNav';

const courseFixture: Course = {
  id: 'course-1',
  title: 'TypeScript สำหรับทีม',
  slug: 'typescript-for-teams',
  description: null,
  price: '2490',
  promoPrice: '1990',
  promoStartsAt: '2026-08-01T00:00:00.000Z',
  promoEndsAt: '2026-08-31T23:59:59.000Z',
  status: 'published',
  thumbnailUrl: 'cdn.example.com/course.jpg',
  createdAt: '2026-08-01T00:00:00.000Z',
  lessonCount: 12,
  enrollmentCount: 28,
};

function collectAdminPages(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectAdminPages(path);
    }

    return entry.name === 'page.tsx' ? [path] : [];
  });
}

function collectTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectTsxFiles(path);
    }

    return entry.name.endsWith('.tsx') ? [path] : [];
  });
}

describe('Admin operations UI', () => {
  it('uses Thai-first navigation and keeps nested routes active', () => {
    expect(adminAllLinks.map((link) => link.label)).toEqual(expect.arrayContaining([
      'ภาพรวม',
      'คอร์ส',
      'ผู้เรียน',
      'การชำระเงิน',
    ]));
    const coursesLink = adminAllLinks.find((link) => link.href === '/admin/courses');
    expect(coursesLink).toBeDefined();
    expect(isAdminNavActive('/admin/courses/course-1/edit', coursesLink!)).toBe(true);
    expect(getAdminNavTitle('/admin/courses/course-1/edit')).toBe('คอร์ส');
    expect(getAdminNavTitle('/admin')).toBe('ภาพรวม');
  });

  it('renders real seven-day metrics and the exception queue without invented trends', () => {
    const data: AdminDashboardData = {
      generatedAt: new Date('2026-08-21T03:00:00.000Z'),
      stats: {
        courses: 8,
        publishedCourses: 5,
        users: 120,
        enrollments: 42,
        lessons: 64,
      },
      sevenDay: {
        revenue: 12345,
        enrollments: 7,
      },
      paymentHealth: {
        completed: 18,
        pending: 2,
        verifying: 3,
        failed: 1,
        refunded: 0,
      },
      courseAttention: {
        draft: 2,
        withoutLessons: 1,
        withoutThumbnail: 1,
      },
      recentEnrollments: [],
      recentPayments: [],
    };

    const markup = renderToStaticMarkup(<AdminDashboardView data={data} />);

    expect(markup).toContain('รายได้ 7 วัน');
    expect(markup).toContain('12,345');
    expect(markup).toContain('การชำระเงินที่ต้องตรวจ');
    expect(markup).toContain('ตรวจรายการชำระเงิน');
    expect(markup).toContain('เติมบทเรียนให้คอร์ส');
    expect(markup).not.toContain('+12.5%');
    expect(markup).not.toContain('กราฟ');
  });

  it('derives course health, primary actions, filters, and promo windows from records', () => {
    expect(getCourseHealth(courseFixture)).toEqual({ label: 'พร้อมใช้งาน', tone: 'success' });
    expect(getCoursePrimaryAction(courseFixture)).toEqual({
      href: '/admin/courses/course-1/lessons',
      label: 'จัดบทเรียน',
    });
    expect(isCoursePromoActive(courseFixture, new Date('2026-08-21T00:00:00.000Z'))).toBe(true);
    expect(isCoursePromoActive(courseFixture, new Date('2026-09-01T00:00:00.000Z'))).toBe(false);

    const draftCourse: Course = {
      ...courseFixture,
      id: 'course-2',
      title: 'React พื้นฐาน',
      slug: 'react-basics',
      status: 'draft',
      thumbnailUrl: null,
      lessonCount: 0,
    };

    expect(getCourseHealth(draftCourse)).toEqual({ label: 'เติมบทเรียน', tone: 'danger' });
    expect(getCoursePrimaryAction(draftCourse).label).toBe('เพิ่มบทเรียน');
    expect(filterAdminCourses([courseFixture, draftCourse], 'react', 'all')).toEqual([draftCourse]);
    expect(filterAdminCourses([courseFixture, draftCourse], '', 'published')).toEqual([courseFixture]);
  });

  it('keeps every admin route on the shared operations surface and removes legacy presentation literals', () => {
    const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
    const adminPages = collectAdminPages(join(process.cwd(), 'src/app/admin'));
    const migratedSources = adminPages.map((path) => readFileSync(path, 'utf8'));
    const adminComponentSources = collectTsxFiles(join(process.cwd(), 'src/components/admin'))
      .map((path) => readFileSync(path, 'utf8'));

    expect(adminPages).toHaveLength(27);
    for (const migratedSource of migratedSources) {
      expect(migratedSource).not.toContain('<style');
      expect(migratedSource).not.toMatch(/#[0-9a-f]{3,8}/i);
      expect(migratedSource).not.toMatch(/rgba\(|linear-gradient\(/);
      expect(migratedSource).not.toContain('boxShadow');
      expect(migratedSource).not.toMatch(/(?:background|color): ['"]white['"]/);
    }

    for (const componentSource of adminComponentSources) {
      expect(componentSource).not.toMatch(/rgba\(|linear-gradient\(|radial-gradient\(/);
      expect(componentSource).not.toContain('boxShadow');
      expect(componentSource).not.toMatch(/(?:background|color): ['"]white['"]/);
    }

    const layoutSource = source('src/app/admin/layout.tsx');
    expect(layoutSource).toContain('data-admin-route-surface');
    expect(layoutSource).toContain('data-admin-visual-system="operations-v2"');

    const themeSource = source('src/app/admin/admin-theme.css');
    expect(themeSource).not.toMatch(/#[0-9a-f]{3,8}/i);
    expect(themeSource).toContain('.admin-theme {');
    expect(themeSource).toContain('color: var(--foreground)');
    expect(themeSource).toContain('.admin-route-surface {');
    expect(themeSource).toContain('max-width: 96rem');
    expect(themeSource).toContain('margin-inline: auto');
    expect(themeSource).not.toContain('!important');
    expect(themeSource).not.toContain(':has(');
    expect(themeSource).not.toContain('[style*=');
    expect(themeSource).not.toContain(':where(');
    expect(themeSource).not.toContain('@media');
    expect(themeSource).not.toMatch(/admin-(?:course-enrollments|lesson|edit|users)-/);
    expect(themeSource.trim().split(/\r?\n/)).toHaveLength(9);

    const operationsSource = source('src/components/admin/ui/AdminOperations.tsx');
    expect(operationsSource).toContain('border-b border-border pb-5');
    expect(operationsSource).not.toContain('bg-gradient');

    const usersSource = source('src/app/admin/users/page.tsx');
    expect(usersSource).toContain('AdminMetricCard');
    expect(usersSource).not.toContain('useRedesignedWorkspace');
    expect(usersSource).not.toContain('window.location.href');

    expect(source('src/app/admin/analytics/page.tsx')).toContain("redirect('/admin')");

    const headerSource = source('src/components/admin/AdminHeader.tsx');
    expect(headerSource).not.toContain('Bell');
    expect(headerSource).not.toContain('Search');
    expect(headerSource).not.toContain('Notifications');
    expect(headerSource).not.toContain('สร้างใหม่');
  });

  it('keeps migrated admin interactions on shadcn composition contracts', () => {
    const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
    const adminPageSources = collectAdminPages(join(process.cwd(), 'src/app/admin'))
      .map((path) => readFileSync(path, 'utf8'));
    const adminComponentSources = collectTsxFiles(join(process.cwd(), 'src/components/admin'))
      .map((path) => readFileSync(path, 'utf8'));
    const combinedSource = [...adminPageSources, ...adminComponentSources].join('\n');

    expect(combinedSource).not.toMatch(/space-y-/);
    expect(combinedSource).not.toContain('<button');
    expect(combinedSource).not.toMatch(/Search className=.*absolute/);

    const enrollmentsSource = source('src/app/admin/courses/[id]/enrollments/page.tsx');
    const enrollmentsViewSource = source('src/components/admin/CourseEnrollmentsView.tsx');
    expect(enrollmentsSource).toContain('normalizeCourseEnrollmentPage');
    expect(enrollmentsSource).not.toContain('admin-course-enrollments-');
    expect(enrollmentsViewSource).toContain('<Table>');
    expect(enrollmentsViewSource).toContain('<AvatarFallback>');
    expect(enrollmentsViewSource).toContain('<Progress');
    expect(enrollmentsViewSource).toContain('<Pagination');

    const lessonsSource = source('src/components/admin/DraggableLessonList.tsx');
    expect(lessonsSource).toContain('KeyboardSensor');
    expect(lessonsSource).toContain('id={`lesson-sort-${courseId}`}');
    expect(lessonsSource).toContain('<TabsList');
    expect(lessonsSource).toContain('<InputGroup');
    expect(lessonsSource).not.toContain('<style');
    expect(lessonsSource).not.toContain('admin-lesson-');

    const reportsSource = source('src/app/admin/reports/page.tsx');
    const settingsSource = source('src/app/admin/settings/page.tsx');
    expect(reportsSource).toContain('<TabsList');
    expect(reportsSource).toContain('<SelectGroup>');
    expect(settingsSource).toContain('<TabsList');
  });
});

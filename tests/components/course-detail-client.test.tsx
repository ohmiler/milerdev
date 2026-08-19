import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import CourseDetailClient, { CourseDetailProvider } from '@/components/course/CourseDetailClient';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}));

describe('course detail enrollment presentation', () => {
  it('does not render a purchase action for a course with no lessons', () => {
    const html = renderToStaticMarkup(
      <CourseDetailProvider>
        <CourseDetailClient
          courseId="course-1"
          courseSlug="course-one"
          price={990}
          originalPrice={1290}
          courseReady={false}
          renderMode="button"
        />
      </CourseDetailProvider>,
    );

    expect(html).toContain('คอร์สกำลังเตรียมเนื้อหา');
    expect(html).toContain('ยังไม่เปิดรับสมัคร');
    expect(html).not.toContain('฿990');
  });
});

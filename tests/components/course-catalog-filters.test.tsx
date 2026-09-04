import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import CourseCatalogFilters from '@/components/course/CourseCatalogFilters';

describe('Course catalog filter presentation', () => {
  it('renders removable facets that preserve the other URL-backed state and exclude sort', () => {
    const html = renderToStaticMarkup(
      <CourseCatalogFilters
        tags={[{ id: 'tag-1', name: 'Frontend', slug: 'frontend' }]}
        search={'React'}
        priceFilter={'free'}
        tagFilter={'frontend'}
        sort={'price-low'}
        totalCourses={4}
        hasActiveFilters
      />,
    );

    expect(html).toMatch(/aria-label=.ลบคำค้น React./);
    expect(html).toMatch(/href=.\/courses\?price=free&amp;tag=frontend&amp;sort=price-low./);
    expect(html).toMatch(/aria-label=.ลบตัวกรองราคา ฟรี./);
    expect(html).toMatch(/href=.\/courses\?search=React&amp;tag=frontend&amp;sort=price-low./);
    expect(html).toMatch(/aria-label=.ลบตัวกรองหัวข้อ Frontend./);
    expect(html).toMatch(/href=.\/courses\?search=React&amp;price=free&amp;sort=price-low./);
    expect(html.match(/aria-label=.ลบ/g)).toHaveLength(3);
    expect(html).toContain('ราคาต่ำไปสูง');
  });
});

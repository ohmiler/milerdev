import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PublicContentHeader from '@/components/content/PublicContentHeader';
import PublicPageHeader from '@/components/layout/PublicPageHeader';

describe('PublicPageHeader', () => {
  it.each([
    ['story', 'About / MilerDev', 'พื้นที่เรียนโค้ดสำหรับคนที่อยากสร้างจริง'],
    ['catalog', 'Courses / MilerDev', 'เลือกคอร์สที่พาไปถึงงานชิ้นถัดไป'],
    ['task', 'Contact / MilerDev', 'บอกเราได้ว่าคุณกำลังติดเรื่องไหน'],
  ] as const)('renders the %s public orientation variant', (variant, eyebrow, title) => {
    const html = renderToStaticMarkup(
      <PublicPageHeader
        variant={variant}
        title={title}
        description="ข้อความอธิบายหน้าสำหรับผู้เยี่ยมชม"
      />,
    );

    expect(html).toContain('<header');
    expect(html).toContain('data-public-header=');
    expect(html).toContain('data-variant=');
    expect(html).toContain('<h1');
    expect(html).not.toContain(eyebrow);
    expect(html).toContain(title);
    expect(html).toContain('ข้อความอธิบายหน้าสำหรับผู้เยี่ยมชม');
  });

  it('supports constrained evidence without changing the shared heading hierarchy', () => {
    const html = renderToStaticMarkup(
      <PublicPageHeader
        variant="catalog"
        title="บทความล่าสุด"
        description="อ่านเรื่องที่ช่วยให้ลงมือทำได้ชัดขึ้น"
        evidence={<aside>อัปเดตทุกสัปดาห์</aside>}
      />,
    );

    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain('data-variant="catalog"');
    expect(html).toContain('อัปเดตทุกสัปดาห์');
  });

  it('keeps the transitional content adapter on the canonical header seam', () => {
    const html = renderToStaticMarkup(
      <PublicContentHeader title="ประกาศ" lede="ข่าวสารล่าสุด" evidence={<aside>หลักฐาน</aside>} />,
    );

    expect(html).toContain('data-public-header=');
    expect(html).toContain('data-variant="catalog"');
    expect(html.match(/<h1/g)).toHaveLength(1);
  });
});

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PublicPageHeader from '@/components/layout/PublicPageHeader';

describe('PublicPageHeader', () => {
  it.each([
    ['story', 'About / MilerDev', 'พื้นที่เรียนโค้ดสำหรับคนที่อยากสร้างจริง'],
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
});

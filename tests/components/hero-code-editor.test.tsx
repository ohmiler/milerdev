import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import HeroCodeEditor from '@/components/home/HeroCodeEditor';

describe('HeroCodeEditor product evidence', () => {
  it('renders a tabs-only editor without explorer or result preview chrome', () => {
    const html = renderToStaticMarkup(<HeroCodeEditor />);

    expect(html).toContain('data-playback="auto"');
    expect(html).toContain('ตัวอย่างพื้นที่เขียนโค้ดของ MilerDev');
    expect(html).toContain('DEMO');
    expect(html).not.toContain('EXPLORER');
    expect(html).not.toContain('โครงสร้างไฟล์ตัวอย่าง');
    expect(html).not.toContain('hero-code-editor__activity');
    expect(html).not.toContain('hero-code-editor__explorer');
    expect(html).not.toContain('RESULT');
    expect(html).not.toContain('hero-code-editor__preview');
    expect(html).toContain('Ln 1, Col 1');
    expect(html).not.toContain('Auto typing');
    expect(html).not.toMatch(/Ln \(\d+\)|Col \(\d+\)/);
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('aria-controls="hero-code-panel"');
    expect(html).toContain('aria-labelledby="hero-code-tab-html"');
  });
});

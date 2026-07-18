import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import HeroCodeEditor from '@/components/home/HeroCodeEditor';

describe('HeroCodeEditor product evidence', () => {
  it('labels the illustrative code-to-result demo and exposes a linked tab panel', () => {
    const html = renderToStaticMarkup(<HeroCodeEditor />);

    expect(html).toContain('data-playback="auto"');
    expect(html).toContain('ตัวอย่างจำลองจากโค้ดสู่ผลลัพธ์ของ MilerDev');
    expect(html).toContain('ผลลัพธ์ตัวอย่างจากโค้ด');
    expect(html).toContain('DEMO');
    expect(html).toContain('RESULT');
    expect(html).toContain('STRUCTURE');
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('aria-controls="hero-code-panel"');
    expect(html).toContain('aria-labelledby="hero-code-tab-html"');
  });
});

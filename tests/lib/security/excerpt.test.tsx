// @vitest-environment jsdom

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { getExcerpt, htmlToPlainText } from '@/lib/security/sanitize';

// The production description of "HTML CSS Masterful" (2026-10-07) showed "HTML &amp; CSS
// Masterfulเปลี่ยนคุณ" on the catalog card and the course page.
const MASTERFUL = '<p>คอร์ส HTML &amp; CSS Masterful</p><p>เปลี่ยนคุณจากมือใหม่ ให้กลายเป็น "เซียน" HTML &amp; CSS</p>';

describe('course description excerpts', () => {
  it('shows an ampersand as an ampersand once React renders the excerpt', () => {
    const html = renderToStaticMarkup(<p>{getExcerpt(MASTERFUL, 200)}</p>);
    const shown = new DOMParser().parseFromString(html, 'text/html').body.textContent;

    expect(shown).toBe('คอร์ส HTML & CSS Masterful เปลี่ยนคุณจากมือใหม่ ให้กลายเป็น "เซียน" HTML & CSS');
  });

  it('keeps a space where a paragraph or line break ended', () => {
    expect(htmlToPlainText('<p>Masterful</p><p>เปลี่ยน</p>')).toBe('Masterful เปลี่ยน');
    expect(htmlToPlainText('บรรทัดแรก<br>บรรทัดสอง')).toBe('บรรทัดแรก บรรทัดสอง');
    expect(htmlToPlainText('<ul><li>HTML</li><li>CSS</li></ul>')).toBe('HTML CSS');
  });

  it('does not split a word around inline formatting', () => {
    expect(htmlToPlainText('เรียน<strong>ฟรี</strong>ได้ทันที')).toBe('เรียนฟรีได้ทันที');
  });

  it('turns markup into text instead of HTML', () => {
    expect(htmlToPlainText('<p>a &lt; b &amp;&amp; c &gt; d</p><script>alert(1)</script>')).toBe('a < b && c > d');
    expect(htmlToPlainText('ช่องว่าง&nbsp;แบบ&nbsp;nbsp')).toBe('ช่องว่าง แบบ nbsp');
  });

  it('cuts long text and marks the cut', () => {
    expect(getExcerpt('<p>abcdefghij</p>', 5)).toBe('abcde...');
    expect(getExcerpt('<p>abc</p>', 5)).toBe('abc');
  });
});

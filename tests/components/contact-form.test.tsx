import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ContactForm from '@/components/contact/ContactForm';

const quote = String.fromCharCode(34);

describe('Contact form contracts', () => {
  it('keeps visible labels and native field constraints', () => {
    const html = renderToStaticMarkup(<ContactForm />);

    expect(html).toContain(`for=${quote}contact-name${quote}`);
    expect(html).toContain(`name=${quote}name${quote}`);
    expect(html).toContain(`name=${quote}email${quote}`);
    expect(html).toContain(`name=${quote}subject${quote}`);
    expect(html).toContain(`name=${quote}message${quote}`);
    expect(html).toContain(`minLength=${quote}10${quote}`);
    expect(html).toMatch(new RegExp(`<button[^>]*type=${quote}submit${quote}`));
  });

  it('preserves its anti-spam and request boundary', () => {
    const source = readFileSync('src/components/contact/ContactForm.tsx', 'utf8');

    expect(source).toContain("fetch('/api/contact'");
    expect(source).toContain("method: 'POST'");
    expect(source).toContain("'Content-Type': 'application/json'");
    expect(source).toContain('_honey: honey');
    expect(source).toContain('_timestamp: formLoadTime.current');
    expect(source).toContain('aria-busy={isSubmitting}');
    expect(source).toContain('pending={isSubmitting}');
    expect(source).toContain('<PendingButton');
  });

  it('exposes accessible pending, error retry, success, and FAQ recovery states', () => {
    const source = readFileSync('src/components/contact/ContactForm.tsx', 'utf8');

    expect(source).toContain(`role={'status'}`);
    expect(source).toContain(`aria-live={'polite'}`);
    expect(source).toContain('ลองส่งข้อความอีกครั้ง');
    expect(source).toContain('ส่งข้อความใหม่');
    expect(source).toContain(`href={'/faq'}`);
  });
});

import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FAQ_CATEGORIES } from '@/app/faq/faq-data';
import ContactForm from '@/components/contact/ContactForm';
import FAQAccordion from '@/components/faq/FAQAccordion';

const quote = String.fromCharCode(34);

describe('studio and support page contracts', () => {
  it('preserves the four FAQ categories and all thirteen published answers', () => {
    expect(FAQ_CATEGORIES).toHaveLength(4);
    expect(FAQ_CATEGORIES.flatMap((category) => category.items)).toHaveLength(13);
    expect(FAQ_CATEGORIES[3].items[0].a).toContain(`${quote}ลืมรหัสผ่าน${quote}`);
    expect(FAQ_CATEGORIES[3].items[2].a).toContain('milerdev.official@gmail.com');
  });

  it('renders closed FAQ disclosures with explicit controls and hidden regions', () => {
    const html = renderToStaticMarkup(
      <FAQAccordion categoryIndex={0} items={FAQ_CATEGORIES[0].items.slice(0, 2)} />,
    );

    expect(html.match(new RegExp(`<button[^>]*type=${quote}button${quote}`, 'g'))).toHaveLength(2);
    expect(html.match(new RegExp(`aria-expanded=${quote}false${quote}`, 'g'))).toHaveLength(2);
    expect(html.match(/data-slot="accordion-item"/g)).toHaveLength(2);
    expect(html.match(/data-slot="accordion-trigger"/g)).toHaveLength(2);
    expect(html).not.toContain(FAQ_CATEGORIES[0].items[0].a);
  });

  it('retains Contact field names, limits, and an explicit submit task', () => {
    const html = renderToStaticMarkup(<ContactForm />);

    expect(html).toContain(`name=${quote}website${quote}`);
    expect(html).toContain(`name=${quote}name${quote}`);
    expect(html).toContain(`minLength=${quote}2${quote}`);
    expect(html).toContain(`name=${quote}email${quote}`);
    expect(html).toContain(`name=${quote}subject${quote}`);
    expect(html).toContain(`maxLength=${quote}200${quote}`);
    expect(html).toContain(`name=${quote}message${quote}`);
    expect(html).toContain(`minLength=${quote}10${quote}`);
    expect(html).toContain(`maxLength=${quote}5000${quote}`);
    expect(html).toMatch(new RegExp(`<button[^>]*type=${quote}submit${quote}`));
  });

  it('keeps the Contact API request and anti-spam payload boundary', () => {
    const source = readFileSync('src/components/contact/ContactForm.tsx', 'utf8');

    expect(source).toContain(`fetch('/api/contact'`);
    expect(source).toContain(`method: 'POST'`);
    expect(source).toContain(`'Content-Type': 'application/json'`);
    expect(source).toContain('_honey: honey');
    expect(source).toContain('_timestamp: formLoadTime.current');
  });
});

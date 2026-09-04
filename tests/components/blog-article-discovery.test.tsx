// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ArticleCourseBridge from '@/components/blog/ArticleCourseBridge';
import EditorialImage from '@/components/blog/EditorialImage';
import TableOfContents from '@/components/blog/TableOfContents';

const items = [
  { id: 'section-เริ่มต้น', text: 'เริ่มต้น', level: 2 as const },
  { id: 'section-ทดลอง', text: 'ทดลอง', level: 3 as const },
];

describe('Blog article discovery', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('offers a collapsed mobile TOC and moves keyboard focus to the stable heading', () => {
    render(
      <>
        <h2 id={items[0].id} tabIndex={-1}>เริ่มต้น</h2>
        <TableOfContents items={items} variant={'mobile'} />
      </>,
    );

    const toggle = screen.getByRole('button', { name: 'สารบัญบทความ (2)' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);

    const link = screen.getByRole('link', { name: 'เริ่มต้น' });
    fireEvent.click(link);
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'เริ่มต้น' }));
    expect(decodeURIComponent(window.location.hash)).toBe(`#${items[0].id}`);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps the desktop TOC expanded and includes nested headings', () => {
    render(<TableOfContents items={items} variant={'desktop'} />);

    expect(screen.getByRole('button', { name: 'สารบัญบทความ (2)' }).getAttribute('aria-expanded'))
      .toBe('true');
    expect(screen.getByRole('link', { name: 'ทดลอง' }).getAttribute('href'))
      .toBe('#section-ทดลอง');
  });

  it('reserves image geometry and exposes a truthful load-error fallback', () => {
    render(
      <EditorialImage
        src={'https://cdn.example.com/article.webp'}
        alt={'ชื่อบทความภาษาไทยที่ยาวมากเพื่อทดสอบการแสดงผล'}
        width={1200}
        height={675}
      />,
    );

    const image = screen.getByRole('img', { name: 'ชื่อบทความภาษาไทยที่ยาวมากเพื่อทดสอบการแสดงผล' });
    expect(image.getAttribute('width')).toBe('1200');
    expect(image.getAttribute('height')).toBe('675');
    expect(image.getAttribute('loading')).toBe('lazy');
    expect(image.getAttribute('aria-busy')).toBe('true');
    expect(image.getAttribute('data-image-state')).toBe('loading');

    fireEvent.error(image);
    expect(screen.getByRole('img', { name: /ไม่สามารถแสดงภาพประกอบ/ }).getAttribute('data-image-state'))
      .toBe('error');
  });

  it('renders one low-pressure catalog bridge without claiming a course relation', () => {
    const html = renderToStaticMarkup(<ArticleCourseBridge />);

    expect(html.match(/<a\b/g)).toHaveLength(1);
    expect(html).toContain('/courses');
    expect(html).toContain('ฝึกต่อจากแนวคิดนี้');
    expect(html).not.toContain('คอร์สที่เกี่ยวข้อง');
  });
});

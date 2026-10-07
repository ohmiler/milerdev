// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import Link from 'next/link';
import { afterEach, describe, expect, it } from 'vitest';

import SectionHeader from '@/components/layout/SectionHeader';

describe('SectionHeader', () => {
  afterEach(cleanup);

  it('gives the section a level-two heading it can be labelled by', () => {
    render(
      <section aria-labelledby="demo-title">
        <SectionHeader id="demo-title" eyebrow="วิธีเรียน" title="เรียนทีละขั้น" description="ภาพจากหน้าเรียนจริง" />
      </section>,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'เรียนทีละขั้น' }).id).toBe('demo-title');
    expect(screen.getByRole('region', { name: 'เรียนทีละขั้น' })).toBeTruthy();
    expect(screen.getByText('วิธีเรียน')).toBeTruthy();
    expect(screen.getByText('ภาพจากหน้าเรียนจริง')).toBeTruthy();
  });

  it('wraps a Thai heading only between phrases', () => {
    render(<SectionHeader id="phrases" title="สอนจากประสบการณ์จริง แล้วอธิบายให้คนเริ่มต้นเห็นภาพ" />);

    const heading = screen.getByRole('heading', { level: 2, name: 'สอนจากประสบการณ์จริง แล้วอธิบายให้คนเริ่มต้นเห็นภาพ' });
    expect([...heading.querySelectorAll('span.inline-block')].map((phrase) => phrase.textContent)).toEqual([
      'สอนจากประสบการณ์จริง',
      'แล้วอธิบายให้คนเริ่มต้นเห็นภาพ',
    ]);
  });

  it('renders only the parts it is given, and the section action', () => {
    render(<SectionHeader id="bare" title="หัวข้อ" action={<Link href="/courses">ดูคอร์สทั้งหมด</Link>} />);

    expect(screen.getByRole('heading', { level: 2 }).previousElementSibling).toBeNull();
    expect(screen.getByRole('heading', { level: 2 }).nextElementSibling).toBeNull();
    expect(screen.getByRole('link', { name: 'ดูคอร์สทั้งหมด' }).getAttribute('href')).toBe('/courses');
  });
});

// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { FAQ_CATEGORIES } from '@/app/faq/faq-data';
import FAQSearch, { searchFaq } from '@/components/faq/FAQSearch';

afterEach(cleanup);

const refund = FAQ_CATEGORIES.flatMap((category) => category.items).find((item) => item.q === 'ขอคืนเงินได้ไหม?')!;

describe('searchFaq', () => {
  it('searches nothing until something is typed', () => {
    expect(searchFaq(FAQ_CATEGORIES, '')).toBeNull();
    expect(searchFaq(FAQ_CATEGORIES, '   ')).toBeNull();
  });

  it('finds a question by words in the question or its answer, all of them required', () => {
    expect(searchFaq(FAQ_CATEGORIES, 'คืนเงิน')?.map((match) => match.item.q)).toContain('ขอคืนเงินได้ไหม?');
    expect(searchFaq(FAQ_CATEGORIES, 'คืนเงิน zzzz')).toEqual([]);
  });

  it('ignores letter case in English words', () => {
    expect(searchFaq(FAQ_CATEGORIES, 'MILERDEV')).toEqual(searchFaq(FAQ_CATEGORIES, 'milerdev'));
    expect(searchFaq(FAQ_CATEGORIES, 'milerdev')?.length).toBeGreaterThan(0);
  });
});

describe('FAQSearch', () => {
  const page = () => render(
    <FAQSearch categories={FAQ_CATEGORIES} nav={<nav aria-label="หมวดคำถาม" />} footer={<p>ช่องทางติดต่อ</p>}>
      <p>คำถามทุกหมวด</p>
    </FAQSearch>,
  );

  it('shows every category until a search is typed, then only the matches with their answers open', () => {
    page();
    expect(screen.getByText('คำถามทุกหมวด')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('ค้นหาคำถาม'), { target: { value: 'คืนเงิน' } });

    expect(screen.queryByText('คำถามทุกหมวด')).toBeNull();
    expect(screen.getByRole('heading', { name: refund.q })).toBeTruthy();
    expect(screen.getByText(refund.a)).toBeTruthy();
    expect(screen.getByText('ช่องทางติดต่อ')).toBeTruthy();
  });

  it('offers to ask the team when nothing matches', () => {
    page();

    fireEvent.change(screen.getByLabelText('ค้นหาคำถาม'), { target: { value: 'ไม่มีคำนี้แน่นอน' } });

    expect(screen.getByRole('heading', { name: 'ไม่พบคำถามที่ตรงกับ “ไม่มีคำนี้แน่นอน”' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'ถามทีมโดยตรง' }).getAttribute('href')).toBe('/contact');
  });
});

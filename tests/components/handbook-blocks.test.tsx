// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChapterLink } from '@/components/handbook/ChapterBlocks';
import { PromptBox } from '@/components/handbook/PromptBox';
import { Quiz } from '@/components/handbook/Quiz';
import { headingId } from '@/lib/handbook/headings';
import { useMDXComponents } from '@/mdx-components';

// Every real chapter is published, so add one still being written to keep the unpublished path covered.
vi.mock('@/lib/handbook/chapters', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/handbook/chapters')>();
  const planned = { number: 99, slug: 'still-being-written', title: 'บทที่ยังเขียนอยู่', summary: '', part: 'shipping' as const, status: 'planned' as const };
  return { ...original, HANDBOOK_CHAPTERS: [...original.HANDBOOK_CHAPTERS, planned] };
});

describe('handbook quiz', () => {
  const quiz = (
    <Quiz
      question="ข้อไหนตรวจได้"
      options={['หน้าเว็บสวย', 'กดแล้วรายการใหม่ขึ้นด้านล่าง']}
      answer={1}
      correct="ถูกต้อง"
      incorrect="ยังไม่ใช่"
    />
  );

  it('says nothing until the reader picks, then marks the pick and explains', () => {
    render(quiz);
    const wrong = screen.getByRole('button', { name: 'หน้าเว็บสวย' });
    expect(screen.getByRole('status').textContent).toBe('');

    fireEvent.click(wrong);
    expect(wrong.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('status').textContent).toBe('ยังไม่ใช่');

    fireEvent.click(screen.getByRole('button', { name: 'กดแล้วรายการใหม่ขึ้นด้านล่าง' }));
    expect(wrong.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('status').textContent).toBe('ถูกต้อง');
  });
});

describe('handbook prompt box', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('copies the prompt exactly as shown and confirms it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const text = 'เป้าหมาย: ทำหน้าเว็บ\n\nเกณฑ์รับงาน:\n- กด Enter แล้วรายการขึ้น';
    render(<PromptBox text={text} />);

    fireEvent.click(screen.getByRole('button', { name: 'คัดลอกโจทย์' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'คัดลอกแล้ว' })).toBeTruthy());
    expect(writeText).toHaveBeenCalledWith(text);
  });

  it('tells the reader to select the text when the clipboard is blocked', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    render(<PromptBox text="โจทย์" />);

    fireEvent.click(screen.getByRole('button', { name: 'คัดลอกโจทย์' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'คัดลอกไม่ได้ ลองเลือกข้อความเอง' })).toBeTruthy());
  });
});

describe('handbook chapter links and headings', () => {
  it('links a published chapter and names one still being written without a link', () => {
    const { rerender } = render(<ChapterLink number={6} />);
    expect(screen.getByRole('link', { name: 'บทที่ 6: เขียนโจทย์ให้ agent' }).getAttribute('href')).toBe('/handbook/writing-prompts-for-agents');

    rerender(<ChapterLink number={99} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('บทที่ 99: บทที่ยังเขียนอยู่ (กำลังเขียน)')).toBeTruthy();
  });

  it('gives an MDX h2 the id that the "ในหน้านี้" list links to', () => {
    const { h2: Heading } = useMDXComponents() as { h2: (props: { children: React.ReactNode }) => React.ReactElement };
    render(<Heading>ตัวอย่าง: จากคำขอกว้าง <strong>ๆ</strong> เป็นโจทย์ที่ตรวจได้</Heading>);

    expect(screen.getByRole('heading', { level: 2 }).getAttribute('id')).toBe(headingId('ตัวอย่าง: จากคำขอกว้าง ๆ เป็นโจทย์ที่ตรวจได้'));
  });
});

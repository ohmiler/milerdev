// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import HomeCodeEditor from '@/components/home/HomeCodeEditor';

let reducedMotion = false;

const editorText = (container: HTMLElement) => container.querySelector('[data-home-editor]')?.textContent ?? '';
const preview = () => within(screen.getByRole('figure', { name: 'ผลลัพธ์ของโค้ดตัวอย่างบนหน้าเว็บ' }));

describe('Home hero code editor', () => {
  beforeEach(() => {
    reducedMotion = false;
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce') && reducedMotion,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('types the program out, then shows its result', () => {
    const { container } = render(<HomeCodeEditor />);

    expect(editorText(container)).not.toContain('useState');
    expect(preview().getByText('กำลังเขียนโค้ด…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'เรียนบทถัดไป' })).toBeNull();

    act(() => { vi.advanceTimersByTime(10_000); });

    expect(editorText(container)).toContain("import { useState } from 'react';");
    expect(editorText(container)).toContain('Ln 16, Col 2');
    expect(preview().getByText('Hello, World')).toBeTruthy();
  });

  it('lets the visitor click the preview button', () => {
    render(<HomeCodeEditor />);
    act(() => { vi.advanceTimersByTime(10_000); });

    fireEvent.click(screen.getByRole('button', { name: 'เรียนบทถัดไป' }));

    expect(screen.getByText('วันนี้เรียนบทที่ 2')).toBeTruthy();
  });

  it('shows the finished program at once when the visitor asks for reduced motion', () => {
    reducedMotion = true;
    const { container } = render(<HomeCodeEditor />);

    expect(editorText(container)).toContain('export default function App()');
    expect(preview().getByText('Hello, World')).toBeTruthy();
  });

  it('keeps the decorative editor out of the accessibility tree but describes it', () => {
    const { container } = render(<HomeCodeEditor />);

    expect(container.querySelector('[data-home-editor]')?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText(/ตัวอย่างการเขียนโค้ด React/)).toBeTruthy();
  });
});

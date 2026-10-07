// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import HomeCodeEditor from '@/components/home/HomeCodeEditor';
import { EDITOR_CYCLE_TICKS, EDITOR_TICK_MS, heroEditorFrame, heroPreviewState } from '@/lib/home/hero-editor';

let reducedMotion = false;

const editorText = (container: HTMLElement) => container.querySelector('[data-home-editor]')?.textContent ?? '';
// The mock page under the browser's address bar.
const previewText = (container: HTMLElement) => container.querySelector('[data-home-preview] > :last-child')?.textContent ?? '';
const tab = (name: string) => screen.getByRole('button', { name });
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
// Milliseconds into the loop at which a frame first matches.
const msUntil = (predicate: (tick: number) => boolean) => {
  for (let tick = 0; tick < EDITOR_CYCLE_TICKS; tick += 1) if (predicate(tick)) return tick * EDITOR_TICK_MS;
  throw new Error('never happens in one loop');
};

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

  it('types App.jsx while the page appears, then types index.css', () => {
    const { container } = render(<HomeCodeEditor />);

    expect(tab('App.jsx').getAttribute('aria-pressed')).toBe('true');
    expect(previewText(container)).toBe('');

    const headingTyped = msUntil((tick) => heroPreviewState(heroEditorFrame(tick).typed).name);
    advance(headingTyped);
    expect(editorText(container)).toContain('<h1>Mint</h1>');
    expect(previewText(container)).toContain('Mint');

    advance(msUntil((tick) => heroEditorFrame(tick).typed.css > 30) - headingTyped);
    expect(tab('index.css').getAttribute('aria-pressed')).toBe('true');
    expect(editorText(container)).toContain('.card {');
  });

  it('starts over after showing the finished page', () => {
    const { container } = render(<HomeCodeEditor />);

    advance(EDITOR_CYCLE_TICKS * EDITOR_TICK_MS);

    expect(tab('App.jsx').getAttribute('aria-pressed')).toBe('true');
    expect(previewText(container)).toBe('');
  });

  it('shows the whole file a visitor picks, and stops the loop', () => {
    const { container } = render(<HomeCodeEditor />);

    fireEvent.click(tab('index.css'));

    expect(tab('index.css').getAttribute('aria-pressed')).toBe('true');
    expect(editorText(container)).toContain('border-radius: 999px;');
    expect(previewText(container)).toContain('ดูผลงาน');

    advance(30_000);
    expect(tab('index.css').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'เล่นการพิมพ์โค้ดตัวอย่างอีกครั้ง' })).toBeTruthy();
  });

  it('pauses on request and plays again from the start', () => {
    const { container } = render(<HomeCodeEditor />);
    advance(2_000);

    fireEvent.click(screen.getByRole('button', { name: 'หยุดการพิมพ์โค้ดตัวอย่าง' }));
    const paused = editorText(container);
    advance(10_000);
    expect(editorText(container)).toBe(paused);

    fireEvent.click(screen.getByRole('button', { name: 'เล่นการพิมพ์โค้ดตัวอย่างอีกครั้ง' }));
    expect(previewText(container)).toBe('');
    expect(screen.getByRole('button', { name: 'หยุดการพิมพ์โค้ดตัวอย่าง' })).toBeTruthy();
  });

  it('shows the finished page at once and does not move when the visitor asks for reduced motion', () => {
    reducedMotion = true;
    const { container } = render(<HomeCodeEditor />);

    expect(editorText(container)).toContain('export default function App()');
    expect(previewText(container)).toContain('ดูผลงาน');
    const still = editorText(container);
    advance(10_000);
    expect(editorText(container)).toBe(still);
  });

  it('describes the demo, keeps the moving code and mock page out of the accessibility tree, and leaves only real controls', () => {
    const { container } = render(<HomeCodeEditor />);

    expect(screen.getByText(/ตัวอย่างการเขียนโค้ด React และ CSS พร้อมหน้าเว็บ/)).toBeTruthy();
    expect(container.querySelector('[data-home-preview]')?.getAttribute('aria-hidden')).toBe('true');
    const focusable = [...container.querySelectorAll('a, button, input, [tabindex]')];
    expect(focusable.every((element) => element.tagName === 'BUTTON' && !element.closest('[aria-hidden="true"]'))).toBe(true);
    expect(focusable).toHaveLength(3);
  });
});

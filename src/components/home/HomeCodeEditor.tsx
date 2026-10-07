'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

import { Button } from '@/components/ui/button';
import {
  buildTypedCode,
  countTypedChars,
  HOME_EDITOR_CODE,
  type CodeTokenKind,
} from '@/lib/home/typed-code';
import { cn } from '@/lib/utils';

// VS Code Dark+ hues. Every text colour in the editor, line numbers included, is at least 4.5:1 on navy.
const TOKEN_COLORS: Record<CodeTokenKind, string> = {
  keyword: '#c586c0',
  storage: '#569cd6',
  function: '#dcdcaa',
  string: '#ce9178',
  variable: '#9cdcfe',
  plain: '#d4d4d4',
  tag: '#569cd6',
  bracket: '#8a9bb0',
  attribute: '#9cdcfe',
  text: '#e6edf3',
  number: '#b5cea8',
};

const TOTAL_CHARS = countTypedChars(HOME_EDITOR_CODE);
const CHARS_PER_TICK = 3;
const TICK_MS = 45;
const BLINK_MS = 530;
// The caret stops blinking after about ten seconds so nothing on the page keeps moving.
const BLINK_TOGGLES = 20;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

const EXPLORER_FILES = [
  { name: 'App.jsx', depth: 2, active: true },
  { name: 'main.jsx', depth: 2, active: false },
  { name: 'index.css', depth: 2, active: false },
  { name: 'package.json', depth: 1, active: false },
] as const;

export default function HomeCodeEditor() {
  const reducedMotion = usePrefersReducedMotion();
  const [typed, setTyped] = useState(0);
  const [caretHidden, setCaretHidden] = useState(false);
  const [lesson, setLesson] = useState(1);

  const view = buildTypedCode(HOME_EDITOR_CODE, reducedMotion ? TOTAL_CHARS : typed);

  useEffect(() => {
    if (reducedMotion || view.done) return;
    const timer = window.setInterval(() => {
      setTyped((current) => Math.min(TOTAL_CHARS, current + CHARS_PER_TICK));
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [reducedMotion, view.done]);

  useEffect(() => {
    if (reducedMotion || !view.done) return;
    let toggles = 0;
    const timer = window.setInterval(() => {
      toggles += 1;
      setCaretHidden(toggles % 2 === 1 && toggles < BLINK_TOGGLES);
      if (toggles >= BLINK_TOGGLES) window.clearInterval(timer);
    }, BLINK_MS);
    return () => window.clearInterval(timer);
  }, [reducedMotion, view.done]);

  return (
    <div className="relative lg:pb-28">
      <figure className="m-0">
        <figcaption className="sr-only">ตัวอย่างการเขียนโค้ด React ในโปรแกรมแก้ไขโค้ด แล้วดูผลลัพธ์บนหน้าเว็บ</figcaption>
        <div
          aria-hidden="true"
          data-home-editor
          className="overflow-hidden rounded-2xl border border-[#1d3a57] bg-navy shadow-[0_30px_60px_-30px_rgba(15,35,58,0.6)]"
        >
          <div className="flex h-9 items-center gap-[7px] border-b border-white/5 bg-[#0b1a2b] px-3.5">
            <span className="size-[11px] rounded-full bg-[#ff5f57]" />
            <span className="size-[11px] rounded-full bg-[#febc2e]" />
            <span className="size-[11px] rounded-full bg-[#28c840]" />
            <span className="flex-1 text-center text-[0.8125rem] text-[#8fa3b8]">App.jsx — milerdev-course</span>
            <span className="w-[47px]" />
          </div>

          <div className="flex">
            <div className="hidden w-39 shrink-0 border-r border-white/5 bg-[#0b1a2b] py-3 text-[0.8125rem] leading-[1.9] text-[#8fa3b8] md:block lg:hidden xl:block">
              <div className="px-3.5 pb-1.5 text-[0.6875rem] font-semibold tracking-[0.06em]">EXPLORER</div>
              <div className="px-3.5 font-medium text-[#c9d6e2]">▾ milerdev-course</div>
              <div className="pr-3.5 pl-6.5">▾ src</div>
              {EXPLORER_FILES.map((file) => (
                <div
                  key={file.name}
                  className={cn('pr-3.5', file.depth === 2 ? 'pl-10' : 'pl-6.5', file.active && 'bg-primary/15 text-[#f7f9fb]')}
                >
                  {file.name}
                </div>
              ))}
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex bg-[#0b1a2b] text-[0.8125rem]">
                <span className="border-t-2 border-primary bg-navy px-4 py-1.5 text-[#f7f9fb]">App.jsx</span>
                <span className="border-t-2 border-transparent px-4 py-1.5 text-[#8fa3b8]">index.css</span>
              </div>
              <div
                className="h-[344px] overflow-hidden py-3 text-xs leading-5 [font-variant-ligatures:none] sm:h-[376px] sm:text-[0.8125rem] sm:leading-[22px]"
                style={{ fontFamily: 'var(--font-code), var(--font-prompt)' }}
              >
                {view.lines.map((line) => (
                  <div key={line.number} className="flex whitespace-pre">
                    <span className="w-[30px] shrink-0 pr-3 text-right text-[#7d93a8] sm:w-[46px] sm:pr-3.5">{line.number}</span>
                    <span className="min-w-0">
                      {line.tokens.map((token, index) => (
                        <span key={index} style={{ color: TOKEN_COLORS[token.kind] }}>{token.text}</span>
                      ))}
                      {line.hasCaret ? (
                        <span className={cn('ml-px inline-block h-[1.15em] w-0.5 align-text-bottom', caretHidden ? 'bg-transparent' : 'bg-primary')} />
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between gap-3 bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
            <span>main</span>
            <span>Ln {view.caretLine}, Col {view.caretColumn} · UTF-8 · JSX</span>
          </div>
        </div>
      </figure>

      <figure
        aria-label="ผลลัพธ์ของโค้ดตัวอย่างบนหน้าเว็บ"
        className="m-0 mt-3 overflow-hidden rounded-2xl border bg-card shadow-[0_24px_48px_-20px_rgba(15,35,58,0.45)] lg:absolute lg:-right-3 lg:bottom-0 lg:mt-0 lg:w-1/2 xl:-right-7"
      >
        <div aria-hidden="true" className="flex h-8 items-center gap-1.5 border-b bg-muted px-3">
          <span className="size-[9px] rounded-full bg-border" />
          <span className="size-[9px] rounded-full bg-border" />
          <span className="size-[9px] rounded-full bg-border" />
          <span className="ml-2 font-mono text-[0.8125rem] text-muted-foreground">localhost:5173</span>
        </div>
        <div className="flex min-h-[150px] flex-col justify-center px-5 py-4">
          {view.done ? (
            <div className="flex flex-col items-start gap-2">
              <p className="text-[1.375rem] leading-snug font-bold">Hello, World</p>
              <p className="text-[0.9375rem] text-muted-foreground">วันนี้เรียนบทที่ {lesson}</p>
              <Button type="button" onClick={() => setLesson((current) => current + 1)}>เรียนบทถัดไป</Button>
            </div>
          ) : (
            <p className="text-[0.9375rem] text-muted-foreground">กำลังเขียนโค้ด…</p>
          )}
        </div>
      </figure>
    </div>
  );
}

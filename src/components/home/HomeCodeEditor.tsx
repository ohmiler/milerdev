'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Pause, Play } from 'lucide-react';

import {
  EDITOR_TICK_MS,
  FINISHED_PROGRESS,
  heroEditorFrame,
  heroPreviewState,
  type HeroEditorFrame,
} from '@/lib/home/hero-editor';
import {
  buildTypedCode,
  HOME_EDITOR_FILE_IDS,
  HOME_EDITOR_FILES,
  type CodeTokenKind,
  type HomeEditorFileId,
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
  selector: '#d7ba7d',
  property: '#9cdcfe',
  value: '#ce9178',
};

// The portfolio card's own colours, as index.css sets them.
const CARD = { ink: '#171717', muted: '#737373', line: '#e5e5e5', surface: '#f5f5f5' } as const;

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

/** Pauses the loop while the editor is scrolled out of view, so it only runs where someone can see it. */
function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const element = ref.current;
    if (!element || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, inView] as const;
}

export default function HomeCodeEditor() {
  const reducedMotion = usePrefersReducedMotion();
  const [rootRef, inView] = useInView<HTMLElement>();
  // null follows the visitor's motion setting; the play and pause button and the tabs set it explicitly.
  const [playing, setPlaying] = useState<boolean | null>(null);
  const [tick, setTick] = useState(0);
  const [openFile, setOpenFile] = useState<HomeEditorFileId>('app');

  const animating = playing ?? !reducedMotion;
  const frame: HeroEditorFrame = animating ? heroEditorFrame(tick) : { file: openFile, typed: FINISHED_PROGRESS };
  const file = HOME_EDITOR_FILES[frame.file];
  const view = buildTypedCode(file.code, frame.typed[frame.file]);
  const preview = heroPreviewState(frame.typed);

  useEffect(() => {
    if (!animating || !inView) return;
    const timer = window.setInterval(() => setTick((current) => current + 1), EDITOR_TICK_MS);
    return () => window.clearInterval(timer);
  }, [animating, inView]);

  const showFile = (id: HomeEditorFileId) => {
    setOpenFile(id);
    setPlaying(false);
  };

  const togglePlaying = () => {
    if (animating) {
      showFile(frame.file);
      return;
    }
    setTick(0);
    setPlaying(true);
  };

  return (
    <figure ref={rootRef} className="m-0">
      <figcaption className="sr-only">ตัวอย่างการเขียนโค้ด React และ CSS พร้อมหน้าเว็บที่ได้ในหน้าต่างเดียวกัน</figcaption>
      <div
        data-home-editor
        className="overflow-hidden rounded-2xl border border-[#1d3a57] bg-navy shadow-[0_30px_60px_-30px_rgba(15,35,58,0.6)]"
      >
        <div className="flex h-9 items-center gap-[7px] border-b border-white/5 bg-[#0b1a2b] pr-1 pl-3.5">
          <span aria-hidden="true" className="size-[11px] rounded-full bg-[#ff5f57]" />
          <span aria-hidden="true" className="size-[11px] rounded-full bg-[#febc2e]" />
          <span aria-hidden="true" className="size-[11px] rounded-full bg-[#28c840]" />
          <span aria-hidden="true" className="flex-1 text-center text-[0.8125rem] text-[#8fa3b8]">{file.name} — my-portfolio</span>
          <button
            type="button"
            onClick={togglePlaying}
            aria-label={animating ? 'หยุดการพิมพ์โค้ดตัวอย่าง' : 'เล่นการพิมพ์โค้ดตัวอย่างอีกครั้ง'}
            className="grid size-7 place-items-center rounded-md text-[#8fa3b8] transition-colors hover:bg-white/10 hover:text-[#f7f9fb] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none motion-reduce:transition-none"
          >
            {animating ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
          </button>
        </div>

        {/* Code and browser side by side where the window is wide enough, stacked where it is not. */}
        <div className="flex flex-col md:flex-row lg:flex-col xl:flex-row">
          <div className="flex min-w-0 flex-col md:flex-[1.25] xl:flex-[1.25]">
            <div className="flex bg-[#0b1a2b] text-[0.8125rem]">
              {HOME_EDITOR_FILE_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={frame.file === id}
                  onClick={() => showFile(id)}
                  className={cn(
                    'border-t-2 px-4 py-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-inset motion-reduce:transition-none',
                    frame.file === id ? 'border-primary bg-navy text-[#f7f9fb]' : 'border-transparent text-[#8fa3b8] hover:text-[#f7f9fb]',
                  )}
                >
                  {HOME_EDITOR_FILES[id].name}
                </button>
              ))}
            </div>
            <div
              aria-hidden="true"
              className="h-[364px] overflow-hidden py-3 text-xs leading-5 [font-variant-ligatures:none]"
              style={{ fontFamily: 'var(--font-code), var(--font-prompt)' }}
            >
              {view.lines.map((line) => (
                <div key={line.number} className="flex whitespace-pre">
                  <span className="w-[34px] shrink-0 pr-3 text-right text-[#7d93a8]">{line.number}</span>
                  <span className="min-w-0">
                    {line.tokens.map((token, index) => (
                      <span key={index} style={{ color: TOKEN_COLORS[token.kind] }}>{token.text}</span>
                    ))}
                    {animating && line.hasCaret ? <span className="ml-px inline-block h-[1.15em] w-0.5 bg-primary align-text-bottom" /> : null}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* The page the code builds. A picture of a site: its button is not a control, so it stays out of the tab order. */}
          <div
            aria-hidden="true"
            data-home-preview
            className="flex min-w-0 flex-col border-t border-white/10 md:flex-1 md:border-t-0 md:border-l lg:border-t lg:border-l-0 xl:border-t-0 xl:border-l"
          >
            <div className="flex h-8 shrink-0 items-center gap-2 bg-[#0b1a2b] px-3 text-[#8fa3b8]">
              <span className="text-sm leading-none">‹ ›</span>
              <span className="flex-1 truncate rounded-md bg-navy px-2.5 py-0.5 font-mono text-[0.8125rem]">localhost:5173</span>
            </div>
            <div className="flex min-h-[240px] flex-1 flex-col bg-white p-4 text-[0.8125rem] leading-snug text-[#171717]">
              <div
                className={cn(
                  'flex flex-col items-start gap-2 border transition-all duration-300 motion-reduce:transition-none',
                  preview.cardPadding && 'p-5',
                  preview.cardRounded && 'rounded-xl',
                )}
                style={{ borderColor: preview.cardBorder ? CARD.line : 'transparent' }}
              >
                {preview.avatar ? (
                  <span
                    className={cn('grid size-12 shrink-0 place-items-center text-base font-semibold', preview.avatarRound ? 'rounded-full' : 'rounded-none')}
                    style={{ background: CARD.surface, color: '#404040' }}
                  >
                    M
                  </span>
                ) : null}
                {preview.name ? <p className="text-2xl leading-tight font-semibold tracking-[-0.02em]">Miler</p> : null}
                {preview.role ? <p style={preview.roleMuted ? { color: CARD.muted } : undefined}>Frontend Developer</p> : null}
                {preview.react ? (
                  <ul
                    className={cn(
                      preview.skillsRow ? 'flex' : 'block',
                      preview.skillsGap && 'gap-3',
                      preview.skillsBare ? 'list-none pl-0' : 'list-disc pl-5',
                    )}
                  >
                    <li>React</li>
                    {preview.css ? <li>CSS</li> : null}
                    {preview.ai ? <li>AI</li> : null}
                  </ul>
                ) : null}
                {preview.button ? (
                  <span
                    className={cn('mt-1 inline-block border px-4 py-1.5 font-medium', preview.buttonRounded ? 'rounded-lg' : 'rounded-[3px]')}
                    style={
                      preview.buttonColors
                        ? { background: CARD.ink, borderColor: CARD.ink, color: '#ffffff' }
                        : { background: '#efefef', borderColor: '#767676', color: CARD.ink }
                    }
                  >
                    ดูผลงาน
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div aria-hidden="true" className="flex justify-between gap-3 bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
          <span>main</span>
          <span>Ln {view.caretLine}, Col {view.caretColumn} · UTF-8 · {file.language}</span>
        </div>
      </div>
    </figure>
  );
}

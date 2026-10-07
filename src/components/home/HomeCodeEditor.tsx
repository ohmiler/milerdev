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

const EXPLORER_FILES = [
  { name: 'App.jsx', depth: 2 },
  { name: 'main.jsx', depth: 2 },
  { name: 'index.css', depth: 2 },
  { name: 'package.json', depth: 1 },
] as const;

export default function HomeCodeEditor() {
  const reducedMotion = usePrefersReducedMotion();
  const [rootRef, inView] = useInView<HTMLDivElement>();
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
    <div ref={rootRef} className="relative lg:pb-36">
      <figure className="m-0">
        <figcaption className="sr-only">ตัวอย่างการเขียนโค้ด React และ CSS ในโปรแกรมแก้ไขโค้ด แล้วดูหน้าเว็บที่ได้</figcaption>
        <div
          data-home-editor
          className="overflow-hidden rounded-2xl border border-[#1d3a57] bg-navy shadow-[0_30px_60px_-30px_rgba(15,35,58,0.6)]"
        >
          <div className="flex h-9 items-center gap-[7px] border-b border-white/5 bg-[#0b1a2b] pr-1 pl-3.5">
            <span aria-hidden="true" className="size-[11px] rounded-full bg-[#ff5f57]" />
            <span aria-hidden="true" className="size-[11px] rounded-full bg-[#febc2e]" />
            <span aria-hidden="true" className="size-[11px] rounded-full bg-[#28c840]" />
            <span aria-hidden="true" className="flex-1 text-center text-[0.8125rem] text-[#8fa3b8]">{file.name} — milerdev-course</span>
            <button
              type="button"
              onClick={togglePlaying}
              aria-label={animating ? 'หยุดการพิมพ์โค้ดตัวอย่าง' : 'เล่นการพิมพ์โค้ดตัวอย่างอีกครั้ง'}
              className="grid size-7 place-items-center rounded-md text-[#8fa3b8] transition-colors hover:bg-white/10 hover:text-[#f7f9fb] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none motion-reduce:transition-none"
            >
              {animating ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
            </button>
          </div>

          <div className="flex">
            <div aria-hidden="true" className="hidden w-39 shrink-0 border-r border-white/5 bg-[#0b1a2b] py-3 text-[0.8125rem] leading-[1.9] text-[#8fa3b8] md:block lg:hidden xl:block">
              <div className="px-3.5 pb-1.5 text-[0.6875rem] font-semibold tracking-[0.06em]">EXPLORER</div>
              <div className="px-3.5 font-medium text-[#c9d6e2]">▾ milerdev-course</div>
              <div className="pr-3.5 pl-6.5">▾ src</div>
              {EXPLORER_FILES.map((entry) => (
                <div
                  key={entry.name}
                  className={cn('pr-3.5', entry.depth === 2 ? 'pl-10' : 'pl-6.5', entry.name === file.name && 'bg-primary/15 text-[#f7f9fb]')}
                >
                  {entry.name}
                </div>
              ))}
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
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
                className="h-[364px] overflow-hidden py-3 text-xs leading-5 [font-variant-ligatures:none] sm:h-[398px] sm:text-[0.8125rem] sm:leading-[22px]"
                style={{ fontFamily: 'var(--font-code), var(--font-prompt)' }}
              >
                {view.lines.map((line) => (
                  <div key={line.number} className="flex whitespace-pre">
                    <span className="w-[30px] shrink-0 pr-3 text-right text-[#7d93a8] sm:w-[46px] sm:pr-3.5">{line.number}</span>
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
          </div>

          <div aria-hidden="true" className="flex justify-between gap-3 bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
            <span>main</span>
            <span>Ln {view.caretLine}, Col {view.caretColumn} · UTF-8 · {file.language}</span>
          </div>
        </div>

        {/* The page the code builds. Shown, not used: its link and button are pictures of a site, so it stays out of the tab order. */}
        <div
          aria-hidden="true"
          data-home-preview
          className="mt-3 overflow-hidden rounded-2xl border bg-card shadow-[0_24px_48px_-20px_rgba(15,35,58,0.45)] lg:absolute lg:-right-3 lg:bottom-0 lg:mt-0 lg:w-[58%] xl:-right-7"
        >
          <div className="flex h-8 items-center gap-1.5 border-b bg-muted px-3">
            <span className="size-[9px] rounded-full bg-border" />
            <span className="size-[9px] rounded-full bg-border" />
            <span className="size-[9px] rounded-full bg-border" />
            <span className="ml-2 font-mono text-[0.8125rem] text-muted-foreground">localhost:5173</span>
          </div>
          <div className="h-[160px] overflow-hidden bg-white p-3 text-[0.8125rem] leading-snug text-[#111820]">
            <div className={cn('min-h-5', preview.navFlex && 'flex items-center gap-3', preview.navSpaced && 'justify-between')}>
              {preview.brand ? <b className="block">MilerCoffee</b> : null}
              {preview.menu ? <span className="block text-[#0000ee] underline">เมนู</span> : null}
            </div>
            <div
              className={cn('mt-2 transition-all duration-300 motion-reduce:transition-none', preview.heroPadding && 'p-4', preview.heroRounded && 'rounded-xl')}
              style={preview.heroColors ? { background: '#6f4e37', color: '#ffffff' } : undefined}
            >
              {preview.heading ? <p className="text-lg leading-tight font-bold">กาแฟคั่วสด</p> : null}
              {preview.text ? <p className="mt-1">ส่งถึงบ้านทุกเช้า</p> : null}
              {preview.button ? (
                <span
                  className={cn('mt-2 inline-block border px-3 py-0.5 text-[#111820]', preview.buttonRounded ? 'rounded-full' : 'rounded-[3px]')}
                  style={preview.buttonFill ? { background: '#ffd28a', borderColor: '#ffd28a' } : { background: '#efefef', borderColor: '#767676' }}
                >
                  สั่งเลย
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </figure>
    </div>
  );
}

'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Check, Link2, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import {
  findStackNode,
  parseStackView,
  STACK_JOURNEYS,
  STACK_LAYERS,
  STACK_NODES,
  STACK_TOUR,
  STACK_TOUR_FINALE,
  stackNeighbors,
  stackViewQuery,
  type StackView,
} from '@/lib/content/stack';
import { cn } from '@/lib/utils';
import type { SceneInsets } from './StackScene';

const StackScene = dynamic(() => import('./StackScene'), {
  ssr: false,
  loading: () => <p className="grid size-full place-items-center text-sm text-white/60">กำลังโหลดโมเดล 3 มิติ...</p>,
});

const STEP_MS = 2600;
const TOUR_MS = 4500;
const DEFAULT_PART = 'nextjs';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const GAP = 12;

function subscribeReducedMotion(callback: () => void) {
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

function useReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(REDUCED_MOTION_QUERY).matches, () => false);
}

const chipClass = 'shrink-0 whitespace-nowrap rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/85 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white aria-pressed:border-white aria-pressed:bg-white aria-pressed:text-[#0f233a]';
const iconButtonClass = 'inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40';

// Shown instead of the model when the browser cannot draw WebGL.
function FlatStack({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="absolute inset-0 flex flex-col gap-3 overflow-y-auto px-4 pt-32 pb-[16rem] sm:px-8 lg:pt-48 lg:pr-[27rem] lg:pb-8">
      <p className="text-sm text-white/60">เบราว์เซอร์นี้แสดงโมเดล 3 มิติไม่ได้ จึงแสดงเป็นแผนผังแทน</p>
      {STACK_LAYERS.map((layer) => (
        <div key={layer.id} className="rounded-2xl border border-white/10 p-3">
          <p className="mb-2 text-xs font-medium" style={{ color: layer.color }}>{layer.name}</p>
          <div className="flex flex-wrap gap-2">
            {STACK_NODES.filter((node) => node.layer === layer.id).map((node) => (
              <button key={node.id} type="button" aria-pressed={node.id === selectedId} className={chipClass} onClick={() => onSelect(node.id)}>{node.name}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StackExplorer() {
  const [selectedId, setSelectedId] = useState<string | null>(DEFAULT_PART);
  const [journeyId, setJourneyId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [tourStop, setTourStop] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [layoutKey, setLayoutKey] = useState(0);
  const [copied, setCopied] = useState<'done' | 'failed' | null>(null);
  const reducedMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  // The address bar follows the view only after the viewer has done something, so /stack stays clean.
  const interactedRef = useRef(false);

  const journey = STACK_JOURNEYS.find((item) => item.id === journeyId) ?? null;
  const journeyEdges = useMemo(() => journey?.steps.map(({ from, to }) => ({ from, to })) ?? null, [journey]);
  const activeEdge = useMemo(() => (journey ? { from: journey.steps[step].from, to: journey.steps[step].to } : null), [journey, step]);
  const stop = tourStop === null ? null : STACK_TOUR[tourStop];
  const focusIds = useMemo(() => (stop ? STACK_NODES.filter((node) => node.layer === stop.layer).map((node) => node.id) : null), [stop]);
  const stopLayer = stop ? STACK_LAYERS.find((layer) => layer.id === stop.layer) : undefined;
  const currentStep = journey?.steps[step];
  const selected = selectedId ? findStackNode(selectedId) : undefined;
  const selectedLayer = selected ? STACK_LAYERS.find((layer) => layer.id === selected.layer) : undefined;
  const lastStep = journey ? journey.steps.length - 1 : 0;
  const query = stackViewQuery({ part: selectedId === DEFAULT_PART ? null : selectedId, flow: journeyId, tour: tourStop !== null });

  const startJourney = useCallback((id: string) => {
    setTourStop(null);
    setJourneyId(id);
    setStep(0);
    setSelectedId(null);
    setPlaying(!reducedMotion);
  }, [reducedMotion]);

  const startTour = useCallback(() => {
    setJourneyId(null);
    setSelectedId(null);
    setTourStop(0);
    setPlaying(!reducedMotion);
  }, [reducedMotion]);

  const openView = useCallback((view: StackView) => {
    if (view.tour) startTour();
    else if (view.flow) startJourney(view.flow);
    else if (view.part) setSelectedId(view.part);
  }, [startJourney, startTour]);

  // A shared link (?part=, ?flow=, ?tour) opens that view. The URL can only be read after hydration.
  useEffect(() => {
    const shared = parseStackView(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- applies the shared link once, after hydration
    if (shared) openView(shared);
  }, [openView]);

  useEffect(() => {
    if (!interactedRef.current) return;
    window.history.replaceState(null, '', `${window.location.pathname}${query}`);
  }, [query]);

  useEffect(() => {
    if (!playing || reducedMotion) return;
    if (tourStop !== null) {
      const timer = setTimeout(() => {
        if (tourStop + 1 < STACK_TOUR.length) setTourStop(tourStop + 1);
        else startJourney(STACK_TOUR_FINALE);
      }, TOUR_MS);
      return () => clearTimeout(timer);
    }
    if (!journey || step >= lastStep) return;
    const timer = setTimeout(() => {
      setStep(step + 1);
      if (step + 1 >= lastStep) setPlaying(false);
    }, STEP_MS);
    return () => clearTimeout(timer);
  }, [journey, playing, reducedMotion, step, lastStep, tourStop, startJourney]);

  // Refit the model whenever the overlays change size (breakpoints, wrapping text).
  useEffect(() => {
    const observer = new ResizeObserver(() => setLayoutKey((key) => key + 1));
    if (titleRef.current) observer.observe(titleRef.current);
    if (panelRef.current) observer.observe(panelRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  // The model may sit below the title or beside it; the scene keeps whichever lets it be larger.
  const getInsets = useCallback((): SceneInsets[] => {
    const base = { top: GAP, right: GAP, bottom: GAP, left: GAP };
    const hero = heroRef.current?.getBoundingClientRect();
    if (!hero) return [base];
    const panel = panelRef.current?.getBoundingClientRect();
    if (panel?.width) {
      // Across the bottom on phones, down the right side on wide screens.
      if (panel.width > hero.width * 0.6) base.bottom = hero.bottom - panel.top + GAP;
      else base.right = hero.right - panel.left + GAP;
    }
    const hint = hintRef.current?.getBoundingClientRect();
    if (hint?.height) base.bottom = Math.max(base.bottom, hero.bottom - hint.top + GAP);
    const title = titleRef.current?.getBoundingClientRect();
    if (!title?.height) return [base];
    return [
      { ...base, top: title.bottom - hero.top + GAP },
      { ...base, left: title.right - hero.left + GAP },
    ];
  }, []);

  const interact = () => { interactedRef.current = true; };
  const selectNode = useCallback((id: string) => {
    interactedRef.current = true;
    setSelectedId(id);
    setPlaying(false);
  }, []);
  const markUnavailable = useCallback(() => setUnavailable(true), []);

  const goToStep = (index: number) => {
    setStep(Math.max(0, Math.min(lastStep, index)));
    setPlaying(false);
  };
  const goToStop = (index: number) => {
    setPlaying(false);
    if (index >= STACK_TOUR.length) startJourney(STACK_TOUR_FINALE);
    else setTourStop(Math.max(0, index));
  };
  const togglePlay = () => {
    if (journey && step >= lastStep) setStep(0);
    setPlaying(!playing);
  };
  const close = () => {
    interact();
    setJourneyId(null);
    setTourStop(null);
    setPlaying(false);
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}${query}`);
      setCopied('done');
    } catch {
      setCopied('failed');
    }
  };

  const playButton = !reducedMotion ? (
    <button type="button" className={iconButtonClass} aria-label={playing ? 'หยุดชั่วคราว' : 'เล่นอัตโนมัติ'} onClick={togglePlay}>
      {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
    </button>
  ) : null;
  const closeButton = (
    <button type="button" className={iconButtonClass} aria-label="ปิดเส้นทางนี้" onClick={close}><X className="size-4" aria-hidden /></button>
  );

  return (
    <section ref={heroRef} aria-labelledby="stack-title" className="relative h-[calc(100svh-4.5rem-1px)] min-h-[36rem] overflow-hidden bg-[var(--academy-navy)] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_50%,rgba(0,171,255,.18),transparent_60%)]" aria-hidden />
      <div role="group" aria-label="แผนภาพ 3 มิติของระบบ MilerDev กดที่ชื่อแต่ละส่วนเพื่อดูรายละเอียด" className="absolute inset-0">
        {unavailable
          ? <FlatStack selectedId={selectedId} onSelect={selectNode} />
          : <StackScene selectedId={selectedId} journeyEdges={journeyEdges} activeEdge={activeEdge} focusIds={focusIds} reducedMotion={reducedMotion} getInsets={getInsets} layoutKey={layoutKey} onSelect={selectNode} onUnavailable={markUnavailable} />}
      </div>

      <div ref={titleRef} className="pointer-events-none absolute top-4 left-4 max-w-md pr-4 sm:top-8 sm:left-8">
        <p className="text-sm font-medium text-[#33bcff]">เบื้องหลัง MilerDev</p>
        <h1 id="stack-title" className="mt-1 text-2xl leading-tight font-semibold tracking-[-.02em] sm:text-4xl">เว็บนี้สร้างด้วยอะไร</h1>
        <p className="mt-2 hidden text-sm leading-6 text-white/65 sm:block">หมุนดูโมเดล กดที่แต่ละส่วนเพื่ออ่านรายละเอียด หรือเลือกเหตุการณ์เพื่อดูข้อมูลวิ่งทีละขั้น</p>
      </div>

      {!unavailable ? (
        <p ref={hintRef} className="absolute bottom-5 left-8 hidden text-sm text-white/50 lg:block">
          ลากเพื่อหมุน · กดที่ชื่อเพื่อดูรายละเอียด · <a href="#stack-parts-title" className="underline underline-offset-4 hover:text-white">อ่านแบบข้อความ ↓</a>
        </p>
      ) : null}

      <aside ref={panelRef} aria-label="รายละเอียดและเส้นทางข้อมูล" className="absolute inset-x-3 bottom-3 flex h-[15rem] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1b2d]/90 shadow-2xl backdrop-blur-md lg:inset-x-auto lg:top-6 lg:right-6 lg:bottom-6 lg:h-auto lg:w-[24rem]">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 lg:p-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold lg:text-base">ดูข้อมูลวิ่งจริง</h2>
              <button type="button" onClick={copyLink} className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                {copied === 'done' ? <Check className="size-3.5" aria-hidden /> : <Link2 className="size-3.5" aria-hidden />}
                <span aria-live="polite">{copied === 'done' ? 'คัดลอกแล้ว' : copied === 'failed' ? 'คัดลอกไม่ได้' : 'คัดลอกลิงก์มุมนี้'}</span>
              </button>
            </div>
            <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
              <button type="button" aria-pressed={tourStop !== null} className={cn(chipClass, 'border-[#33bcff] text-[#7fd3ff]')} onClick={() => { interact(); startTour(); }}>▶ ทัวร์ทีละชั้น</button>
              {STACK_JOURNEYS.map((item) => (
                <button key={item.id} type="button" aria-pressed={item.id === journeyId} className={chipClass} onClick={() => { interact(); startJourney(item.id); }}>{item.name}</button>
              ))}
            </div>
          </div>

          {stop && stopLayer && tourStop !== null ? (
            <div className="border-t border-white/10 pt-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="min-w-0 truncate font-semibold">ทัวร์ทีละชั้น</h3>
                <div className="flex items-center gap-1.5">
                  <button type="button" className={iconButtonClass} aria-label="ชั้นก่อนหน้า" disabled={tourStop === 0} onClick={() => goToStop(tourStop - 1)}><SkipBack className="size-4" aria-hidden /></button>
                  {playButton}
                  <button type="button" className={iconButtonClass} aria-label={tourStop + 1 < STACK_TOUR.length ? 'ชั้นถัดไป' : 'ไปดูข้อมูลวิ่งจริง'} onClick={() => goToStop(tourStop + 1)}><SkipForward className="size-4" aria-hidden /></button>
                  {closeButton}
                </div>
              </div>
              <div className="mt-2 rounded-xl bg-white px-3 py-2 text-sm text-[#0f233a]">
                <p className="font-medium">{tourStop + 1}/{STACK_TOUR.length} · ชั้น{stopLayer.name}</p>
                <p>{stop.text}</p>
              </div>
            </div>
          ) : null}

          {journey && currentStep ? (
            <div className="border-t border-white/10 pt-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="min-w-0 truncate font-semibold">{journey.name}</h3>
                <div className="flex items-center gap-1.5">
                  <button type="button" className={iconButtonClass} aria-label="ขั้นก่อนหน้า" disabled={step === 0} onClick={() => goToStep(step - 1)}><SkipBack className="size-4" aria-hidden /></button>
                  {playButton}
                  <button type="button" className={iconButtonClass} aria-label="ขั้นถัดไป" disabled={step === lastStep} onClick={() => goToStep(step + 1)}><SkipForward className="size-4" aria-hidden /></button>
                  {closeButton}
                </div>
              </div>
              <p className="mt-1 hidden text-sm text-white/60 lg:block">{journey.summary}</p>
              <div className="mt-2 rounded-xl bg-white px-3 py-2 text-sm text-[#0f233a] lg:hidden">
                <p className="font-medium">{step + 1}/{journey.steps.length} · {findStackNode(currentStep.from)?.name} → {findStackNode(currentStep.to)?.name}</p>
                <p>{currentStep.caption}</p>
              </div>
              <ol className="mt-3 hidden flex-col gap-1 lg:flex">
                {journey.steps.map((item, index) => (
                  <li key={`${item.from}-${item.to}-${index}`}>
                    <button
                      type="button"
                      aria-current={index === step ? 'step' : undefined}
                      className={cn(
                        'flex w-full gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                        index === step ? 'bg-white text-[#0f233a] hover:bg-white' : index < step ? 'text-white/55' : 'text-white/85',
                      )}
                      onClick={() => goToStep(index)}
                    >
                      <span className="w-5 shrink-0 font-mono text-xs leading-5 opacity-70">{index + 1}</span>
                      <span className="min-w-0">
                        <span className="block font-medium">{findStackNode(item.from)?.name} → {findStackNode(item.to)?.name}</span>
                        <span className="block opacity-80">{item.caption}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <div aria-live="polite" className="border-t border-white/10 pt-3">
            {selected && selectedLayer ? (
              <>
                <p className="flex items-center gap-2 text-xs font-medium" style={{ color: selectedLayer.color }}>
                  <span className="size-2 rounded-full" style={{ backgroundColor: selectedLayer.color }} aria-hidden />
                  ชั้น{selectedLayer.name}
                </p>
                <h2 className="mt-1 text-xl font-semibold lg:text-2xl">{selected.name}</h2>
                <p className="text-sm text-white/60">{selected.tag}</p>
                <dl className="mt-3 flex flex-col gap-3 text-sm leading-6">
                  <div><dt className="font-medium">ทำหน้าที่อะไร</dt><dd className="text-white/75">{selected.does}</dd></div>
                  <div><dt className="font-medium">ทำไมใช้ตัวนี้</dt><dd className="text-white/75">{selected.why}</dd></div>
                </dl>
                <h3 className="mt-3 text-sm font-medium">เชื่อมกับ</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {stackNeighbors(selected.id).map((neighbor) => (
                    <li key={neighbor.id}>
                      <button type="button" className={chipClass} onClick={() => selectNode(neighbor.id)}>
                        {findStackNode(neighbor.id)?.name}<span className="text-white/50"> · {neighbor.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-white/60">กดที่ชื่อบนโมเดลเพื่อดูว่าส่วนนั้นทำอะไร ทำไมเลือกใช้ และเชื่อมกับส่วนไหน</p>
            )}
          </div>
        </div>
      </aside>
    </section>
  );
}

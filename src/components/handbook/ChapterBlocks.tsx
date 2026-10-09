// The blocks a handbook chapter's MDX uses beyond plain markdown (ADR 0016, decision 4).

import Link from 'next/link';
import type { ReactNode } from 'react';

import { chapterPath, HANDBOOK_CHAPTERS, isReadable } from '@/lib/handbook/chapters';
import { cn } from '@/lib/utils';

/** The three-line summary at the top of a chapter. */
export function Summary({ children }: { children: ReactNode }) {
  return (
    <section aria-label="สรุป" className="my-8 rounded-2xl bg-muted px-6 py-5 [&_ul]:my-0">
      <p className="m-0 mb-2 font-semibold">สรุปใน 3 บรรทัด</p>
      {children}
    </section>
  );
}

/** What to read first, and what the reader can do after the chapter. */
export function Goals({ prerequisite, outcomes }: { prerequisite?: number; outcomes: string[] }) {
  return (
    <div className="my-8 flex flex-wrap gap-4 text-base leading-7">
      {prerequisite ? (
        <div className="flex-[1_1_14rem] rounded-xl border px-5 py-4">
          <p className="m-0 mb-1 font-semibold">ควรอ่านก่อน</p>
          <ChapterLink number={prerequisite} />
        </div>
      ) : null}
      <div className="flex-[2_1_18rem] rounded-xl border px-5 py-4">
        <p className="m-0 mb-1 font-semibold">อ่านจบแล้วคุณจะ</p>
        <ul className="m-0 list-disc pl-5">
          {outcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}
        </ul>
      </div>
    </div>
  );
}

/** "ตรวจผลยังไง": checks a reader can do without reading code. */
export function CheckList({ items, title = 'ตรวจผลยังไง' }: { items: string[]; title?: string }) {
  return (
    <section aria-label={title} className="my-8 rounded-2xl border border-[var(--color-success)]/40 bg-[var(--color-success-soft)] px-5 py-4">
      <p className="m-0 mb-3 font-semibold text-[var(--color-success-strong)]">{title}</p>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {items.map((item) => (
          <li key={item}>
            <label className="flex cursor-pointer items-start gap-3 leading-7">
              <input type="checkbox" className="mt-1.5 size-5 shrink-0 accent-[var(--color-success-strong)]" />
              <span>{item}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

const CALLOUT_TONES = {
  before: { box: 'border-[var(--color-error-strong)]/30 bg-[var(--color-error-soft)]', label: 'text-[var(--color-error-strong)]' },
  warning: { box: 'border-[var(--color-warning)]/40 bg-[var(--color-warning-soft)]', label: 'text-[var(--color-warning-strong)]' },
  case: { box: 'border bg-card', label: 'text-muted-foreground' },
} as const;

export function Callout({ tone, title, children }: { tone: keyof typeof CALLOUT_TONES; title: string; children: ReactNode }) {
  const styles = CALLOUT_TONES[tone];
  return (
    <aside className={cn('my-8 rounded-2xl border px-5 py-4 [&>*:last-child]:mb-0 [&_p]:my-3', styles.box)}>
      <p className={cn('m-0 font-semibold', styles.label)}>{title}</p>
      {children}
    </aside>
  );
}

/** Links to a chapter once it is readable; until then names it and says it is being written. */
export function ChapterLink({ number }: { number: number }) {
  const chapter = HANDBOOK_CHAPTERS.find((candidate) => candidate.number === number);
  if (!chapter) return null;
  const label = `บทที่ ${chapter.number}: ${chapter.title}`;
  if (!isReadable(chapter)) return <span>{label} (กำลังเขียน)</span>;
  return <Link href={chapterPath(chapter)} className="text-link underline underline-offset-4">{label}</Link>;
}

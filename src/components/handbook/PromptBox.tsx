'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

type CopyState = 'idle' | 'copied' | 'failed';

const COPY_LABELS: Record<CopyState, string> = {
  idle: 'คัดลอกโจทย์',
  copied: 'คัดลอกแล้ว',
  failed: 'คัดลอกไม่ได้ ลองเลือกข้อความเอง',
};

interface PromptBoxProps {
  /** The prompt exactly as a reader would paste it to an agent. */
  text: string;
  title?: string;
}

export function PromptBox({ text, title = 'ลองสั่ง agent แบบนี้' }: PromptBoxProps) {
  const [state, setState] = useState<CopyState>('idle');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
  };

  return (
    <figure className="my-8 overflow-hidden rounded-2xl border border-[var(--color-accent)]/40">
      <figcaption className="flex flex-wrap items-center justify-between gap-3 bg-secondary px-5 py-3">
        <span className="font-semibold text-secondary-foreground">{title}</span>
        <Button type="button" variant="outline" onClick={() => void copy()}>
          {state === 'copied' ? <Check aria-hidden /> : <Copy aria-hidden />}
          {COPY_LABELS[state]}
        </Button>
      </figcaption>
      <pre className="m-0 overflow-x-auto whitespace-pre-wrap bg-card px-5 py-4 font-mono text-[0.9375rem] leading-7 text-card-foreground">{text}</pre>
      <span role="status" className="sr-only">{state === 'copied' ? 'คัดลอกโจทย์แล้ว' : ''}</span>
    </figure>
  );
}

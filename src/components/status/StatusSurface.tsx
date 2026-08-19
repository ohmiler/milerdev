import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface StatusSurfaceProps {
  code: string;
  routeLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  note: string;
  children: ReactNode;
}

export default function StatusSurface({ code, routeLabel, eyebrow, title, description, note, children }: StatusSurfaceProps) {
  return (
    <main className="flex min-h-[calc(100vh-5rem)] items-center bg-[var(--academy-canvas)] px-4 py-16" data-status-surface={routeLabel}>
      <Card className="mx-auto w-full max-w-5xl gap-0 overflow-hidden py-0 shadow-[var(--academy-shadow-card)] lg:grid lg:grid-cols-[.8fr_1.2fr]">
        <div className="flex min-h-72 flex-col justify-between bg-[var(--academy-navy)] p-8 text-white sm:p-10" aria-hidden="true">
          <div className="flex justify-between font-mono text-xs tracking-[.15em] uppercase text-white/65"><span>Route status</span><span className="text-primary">MilerDev</span></div>
          <strong className="font-mono text-7xl font-semibold tracking-[-.08em] sm:text-8xl">{code}</strong>
          <div className="flex items-center gap-3 font-mono text-xs tracking-[.12em] text-white/60 uppercase"><span>01</span><span className="h-px flex-1 bg-white/20" /><span>{routeLabel}</span></div>
        </div>
        <CardContent className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
          <p className="mb-4 font-mono text-xs font-semibold tracking-[.16em] text-primary uppercase">{eyebrow}</p>
          <h1 id="status-surface-title" className="text-3xl leading-tight font-semibold tracking-[-.03em] sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-xl leading-8 text-muted-foreground">{description}</p>
          <div className="mt-8 flex flex-wrap gap-3">{children}</div>
          <Separator className="my-7" />
          <p className="text-sm leading-6 text-muted-foreground">{note}</p>
        </CardContent>
      </Card>
    </main>
  );
}

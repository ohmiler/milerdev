import MainContent from '@/components/layout/MainContent';
import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface StatusSurfaceProps {
  code: string;
  routeLabel: string;
  title: string;
  description: string;
  note: string;
  children: ReactNode;
}

export default function StatusSurface({ code, routeLabel, title, description, note, children }: StatusSurfaceProps) {
  return (
    <MainContent className="flex min-h-[calc(100vh-5rem)] items-center bg-[var(--academy-canvas)] px-4 py-16" data-status-surface={routeLabel}>
      <Card className="mx-auto w-full max-w-5xl gap-0 overflow-hidden py-0 shadow-[var(--academy-shadow-card)] lg:grid lg:grid-cols-[.8fr_1.2fr]">
        <div className="flex min-h-72 items-center justify-center bg-[var(--academy-navy)] p-8 text-white sm:p-10" aria-hidden="true">
          <strong className="font-mono text-7xl font-semibold tracking-[-.08em] sm:text-8xl">{code}</strong>
        </div>
        <CardContent className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
          <h1 id="status-surface-title" className="text-3xl leading-tight font-semibold tracking-[-.03em] sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-xl leading-8 text-muted-foreground">{description}</p>
          <div className="mt-8 flex flex-wrap gap-3">{children}</div>
          <Separator className="my-7" />
          <p className="text-sm leading-6 text-muted-foreground">{note}</p>
        </CardContent>
      </Card>
    </MainContent>
  );
}

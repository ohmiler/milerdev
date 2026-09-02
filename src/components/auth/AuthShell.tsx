import type { ReactNode } from 'react';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type EvidenceItem = { label: string; text: string };

type AuthShellProps = {
  pageId: string;
  panelTitle: string;
  panelDescription: string;
  contextTitle?: ReactNode;
  contextDescription?: string;
  evidence?: EvidenceItem[];
  children: ReactNode;
  variant?: 'login' | 'register' | 'recovery';
};

export default function AuthShell({
  pageId,
  panelTitle,
  panelDescription,
  contextTitle,
  contextDescription,
  evidence = [],
  children,
  variant = 'login',
}: AuthShellProps) {
  const titleId = `${pageId}-title`;
  const contextTitleId = `${pageId}-context-title`;
  const showContextPanel = variant === 'recovery';

  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="bg-[var(--academy-canvas)] px-4 py-10 sm:py-16 lg:py-20">
        <div className={cn('mx-auto w-full', showContextPanel ? 'grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,.9fr)_minmax(24rem,1.1fr)]' : 'max-w-lg', variant === 'register' && 'max-w-2xl')}>
          {showContextPanel ? <Card className="order-2 justify-center border-0 bg-[var(--academy-navy)] text-white shadow-[var(--academy-shadow-card)] lg:order-1" aria-labelledby={contextTitleId}>
            <CardHeader className="gap-6 p-7 sm:p-10">
              <div className="flex items-center gap-3"><Image src="/milerdev-logo-transparent.png" alt="" width={44} height={44} priority /><span className="font-heading text-lg font-semibold">MilerDev Learning</span></div>
              <div>
                <h2 id={contextTitleId} className="font-heading text-3xl font-medium leading-tight text-white sm:text-4xl">{contextTitle}</h2>
                <CardDescription className="mt-4 text-base leading-7 text-white/70">{contextDescription}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-7 pb-8 sm:px-10 sm:pb-10">
              <ol className="divide-y divide-white/10 border-y border-white/10">
                {evidence.map((item, index) => (
                  <li key={item.label} className="grid grid-cols-[2rem_1fr] gap-4 py-5">
                    <span className="font-mono text-xs text-primary">{String(index + 1).padStart(2, '0')}</span>
                    <div><strong className="text-sm text-white">{item.label}</strong><p className="mt-1 text-sm leading-6 text-white/60">{item.text}</p></div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card> : null}

          <Card className={cn('justify-center border-border/70 bg-white shadow-[var(--academy-shadow-card)]', showContextPanel && 'order-1 border-0 lg:order-2')} aria-labelledby={titleId}>
            <CardHeader className="p-7 pb-3 sm:p-10 sm:pb-4">
              <h1 id={titleId} className="font-heading text-3xl font-medium leading-tight sm:text-4xl">{panelTitle}</h1>
              <CardDescription className="mt-2 text-base leading-7">{panelDescription}</CardDescription>
            </CardHeader>
            <CardContent className="px-7 pb-8 sm:px-10 sm:pb-10">{children}</CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}

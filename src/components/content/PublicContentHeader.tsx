import type { ReactNode } from 'react';

interface PublicContentHeaderProps { eyebrow: string; title: string; lede: string; evidence: ReactNode }

export default function PublicContentHeader({ eyebrow, title, lede, evidence }: PublicContentHeaderProps) {
  return (
    <header className="border-b bg-[radial-gradient(circle_at_82%_10%,var(--color-accent-soft),transparent_32%),var(--academy-canvas)] py-16 sm:py-20 lg:py-24">
      <div className="container grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-end lg:gap-16">
        <div><p className="font-mono text-xs tracking-[.16em] text-primary uppercase">{eyebrow}</p><h1 className="mt-5 text-4xl leading-[1.15] font-semibold tracking-[-.04em] sm:text-5xl lg:text-6xl">{title}</h1><p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">{lede}</p></div>
        {evidence}
      </div>
    </header>
  );
}

import type { ReactNode } from 'react';

interface PublicContentHeaderProps { title: string; lede: string; evidence: ReactNode }

export default function PublicContentHeader({ title, lede, evidence }: PublicContentHeaderProps) {
  return (
    <header className="border-b bg-[radial-gradient(circle_at_82%_10%,var(--color-accent-soft),transparent_32%),var(--academy-canvas)] py-16 sm:py-20 lg:py-24">
      <div className="container grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-end lg:gap-16">
        <div><h1 className="text-4xl leading-[1.15] font-semibold tracking-[-.04em] sm:text-5xl lg:text-6xl">{title}</h1><p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">{lede}</p></div>
        {evidence}
      </div>
    </header>
  );
}

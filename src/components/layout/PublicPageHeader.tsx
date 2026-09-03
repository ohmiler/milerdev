import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface PublicPageHeaderProps {
  title: ReactNode;
  description: ReactNode;
  variant: 'story' | 'catalog' | 'task';
  evidence?: ReactNode;
}

export default function PublicPageHeader({
  title,
  description,
  variant,
  evidence,
}: PublicPageHeaderProps) {
  return (
    <header
      data-public-header=""
      data-variant={variant}
      className={cn(
        'border-b bg-[var(--academy-canvas)] py-16 sm:py-20 lg:py-24',
        variant === 'story' && 'bg-[radial-gradient(circle_at_15%_10%,var(--color-accent-soft),transparent_34%),var(--academy-canvas)]',
        variant === 'catalog' && 'bg-[radial-gradient(circle_at_82%_10%,var(--color-accent-soft),transparent_32%),var(--academy-canvas)]',
      )}
    >
      <div className="container">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,.75fr)] lg:items-end lg:gap-16">
          {evidence ? (
            <div className="min-w-0">
              <h1 className="max-w-4xl break-words text-4xl leading-[1.18] font-semibold tracking-[-0.035em] text-pretty sm:text-5xl lg:text-6xl">{title}</h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-pretty text-muted-foreground sm:text-lg">{description}</p>
            </div>
          ) : (
            <>
              <h1 className="min-w-0 max-w-4xl break-words text-4xl leading-[1.18] font-semibold tracking-[-0.035em] text-pretty sm:text-5xl lg:text-6xl">{title}</h1>
              <p className="max-w-2xl text-base leading-8 text-pretty text-muted-foreground sm:text-lg">{description}</p>
            </>
          )}
          {evidence}
        </div>
      </div>
    </header>
  );
}

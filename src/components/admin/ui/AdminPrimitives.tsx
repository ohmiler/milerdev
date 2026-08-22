import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Tone = 'default' | 'dark' | 'info' | 'success' | 'warning' | 'danger';

const pillTones: Record<Tone, string> = {
  default: 'border-border bg-muted text-muted-foreground',
  dark: 'border-foreground bg-foreground text-background',
  info: 'border-primary/20 bg-secondary text-secondary-foreground',
  success: 'border-[var(--color-success)]/20 bg-[var(--color-success-soft)] text-[var(--color-success-strong)]',
  warning: 'border-[var(--color-warning)]/20 bg-[var(--color-warning-soft)] text-[var(--color-warning-strong)]',
  danger: 'border-destructive/20 bg-[var(--color-error-soft)] text-[var(--color-error-strong)]',
};

export function AdminPageHero({
  eyebrow,
  title,
  description,
  actions,
  meta,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 max-w-3xl">
        {children}
        {eyebrow ? <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-primary uppercase">{eyebrow}</p> : null}
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">{description}</p> : null}
        {meta ? <div className="mt-3 text-xs leading-5 text-muted-foreground">{meta}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function AdminSurfaceCard({
  className = '',
  children,
  ...props
}: ComponentPropsWithoutRef<'section'>) {
  return (
    <section className={cn('rounded-xl border border-border bg-card p-5 text-card-foreground shadow-none', className)} {...props}>
      {children}
    </section>
  );
}

export function AdminRailCard({
  className = '',
  children,
  ...props
}: ComponentPropsWithoutRef<'aside'>) {
  return (
    <aside className={cn('grid gap-4 rounded-xl border border-border bg-card p-5 text-card-foreground shadow-none', className)} {...props}>
      {children}
    </aside>
  );
}

export function AdminSectionHeading({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="font-heading text-base font-semibold text-foreground">{title}</div>
        {description ? <div className="mt-1.5 text-sm leading-5 text-muted-foreground">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminPill({
  tone = 'default',
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span className={cn('inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-semibold', pillTones[tone])}>
      {children}
    </span>
  );
}

export function AdminButton({
  href,
  tone = 'default',
  children,
  className = '',
  ...props
}: {
  href?: string;
  tone?: Tone;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<'button'>, 'children'> &
  Omit<ComponentPropsWithoutRef<typeof Link>, 'href' | 'children'>) {
  const variant = tone === 'warning' || tone === 'danger' ? 'destructive' : tone === 'default' ? 'outline' : 'default';
  const classes = cn(
    buttonVariants({ variant, size: 'sm' }),
    tone === 'success' && 'bg-[var(--color-success)] text-white hover:bg-[var(--color-success-strong)]',
    tone === 'info' && 'bg-primary text-primary-foreground',
    tone === 'dark' && 'bg-foreground text-background hover:bg-foreground/90',
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

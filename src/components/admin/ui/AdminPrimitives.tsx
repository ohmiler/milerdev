import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type Tone = 'default' | 'dark' | 'info' | 'success' | 'warning';

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
    <section className="admin-page-hero">
      <div className="admin-page-hero__content">
        {children}
        {eyebrow ? <div className="admin-page-eyebrow">{eyebrow}</div> : null}
        <h1 className="admin-page-title">{title}</h1>
        {description ? <p className="admin-page-description">{description}</p> : null}
        {actions ? <div className="admin-page-hero__actions">{actions}</div> : null}
        {meta ? <div className="admin-page-hero__meta">{meta}</div> : null}
      </div>
    </section>
  );
}

export function AdminSurfaceCard({
  className = '',
  children,
  ...props
}: ComponentPropsWithoutRef<'section'>) {
  return (
    <section className={`admin-surface-card ${className}`.trim()} {...props}>
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
    <aside className={`admin-rail-card ${className}`.trim()} {...props}>
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
    <div className="admin-section-heading">
      <div>
        <div className="admin-section-heading__title">{title}</div>
        {description ? <div className="admin-section-heading__description">{description}</div> : null}
      </div>
      {actions ? <div className="admin-section-heading__actions">{actions}</div> : null}
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
  return <span className={`admin-pill admin-pill--${tone}`}>{children}</span>;
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
  const classes = `admin-button admin-button--${tone} ${className}`.trim();

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

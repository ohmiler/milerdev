import type { ReactNode } from 'react';

interface CourseDetailSectionProps {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}

export default function CourseDetailSection({ id, eyebrow, title, description, children }: CourseDetailSectionProps) {
  return (
    <section id={id} aria-labelledby={id + '-title'} className="grid scroll-mt-40 gap-7 py-10 md:grid-cols-[11.5rem_minmax(0,1fr)] md:gap-9 lg:grid-cols-[14.5rem_minmax(0,1fr)] lg:gap-[4.5rem] lg:py-16">
      <header>
        <p className="mb-3 text-xs font-medium tracking-wide text-primary">{eyebrow}</p>
        <h2 id={id + '-title'} className="text-2xl leading-relaxed font-semibold tracking-tight text-balance">{title}</h2>
        {description && <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>}
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

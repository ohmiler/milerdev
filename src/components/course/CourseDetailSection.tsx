import type { ReactNode } from 'react';

import SectionHeader from '@/components/layout/SectionHeader';

interface CourseDetailSectionProps {
  id: string;
  title: string;
  description?: string;
  /** A short summary of the section, beside the heading from `sm` up. */
  meta?: ReactNode;
  children: ReactNode;
}

export default function CourseDetailSection({ id, title, description, meta, children }: CourseDetailSectionProps) {
  return (
    <section id={id} aria-labelledby={id + '-title'} className="scroll-mt-40 py-10 lg:py-14">
      <SectionHeader
        id={id + '-title'}
        title={title}
        description={description}
        action={meta ? <p className="text-sm text-muted-foreground">{meta}</p> : undefined}
        className="mb-6 lg:mb-8"
      />
      <div className="min-w-0">{children}</div>
    </section>
  );
}

import { Fragment, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  /** The heading's id, for the section's aria-labelledby. */
  id: string;
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** One action that belongs to the whole section, placed beside the heading from `sm` up. */
  action?: ReactNode;
  /** `inverse` on navy surfaces. */
  tone?: 'default' | 'inverse';
  className?: string;
}

/**
 * Thai has no spaces between words, so a browser may wrap a heading mid-phrase. Writers put a space
 * between phrases; keeping each phrase whole makes the heading wrap only there.
 */
function keepPhrasesWhole(title: ReactNode): ReactNode {
  if (typeof title !== 'string') return title;
  return title.split(' ').map((phrase, index) => (
    <Fragment key={index}>
      {index > 0 ? ' ' : null}
      <span className="inline-block">{phrase}</span>
    </Fragment>
  ));
}

/** The heading block of a public page section: one size, one rhythm, on every page that uses it. */
export default function SectionHeader({
  id,
  title,
  eyebrow,
  description,
  action,
  tone = 'default',
  className,
}: SectionHeaderProps) {
  const inverse = tone === 'inverse';

  return (
    <div
      data-section-header=""
      className={cn('flex flex-col gap-5', action && 'sm:flex-row sm:items-end sm:justify-between', className)}
    >
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className={cn('flex items-center gap-2 text-sm font-semibold', inverse ? 'text-link-inverse' : 'text-link')}>
            {eyebrow}
          </p>
        ) : null}
        <h2 id={id} className={cn('text-h2 font-bold text-balance', eyebrow && 'mt-3')}>
          {keepPhrasesWhole(title)}
        </h2>
        {description ? (
          <p className={cn('mt-3 text-pretty leading-8', inverse ? 'text-background/75' : 'text-muted-foreground')}>
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

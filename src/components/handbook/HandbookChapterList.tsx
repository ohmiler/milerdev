import Link from 'next/link';

import { chapterPath, chaptersInPart, HANDBOOK_PARTS, isReadable } from '@/lib/handbook/chapters';
import { cn } from '@/lib/utils';

/** The first path, part by part; chapters still being written are listed without a link. */
export function HandbookChapterList({
  currentSlug,
  compact = false,
  idPrefix = 'handbook-part',
}: {
  currentSlug?: string;
  compact?: boolean;
  /** Distinct per copy on a page, since the chapter page renders the list twice (desktop and phone). */
  idPrefix?: string;
}) {
  const PartHeading = compact ? 'p' : 'h3';
  return (
    <div className={cn(compact ? 'flex flex-col gap-5' : 'grid items-start gap-5 lg:grid-cols-3')}>
      {HANDBOOK_PARTS.map((part, partIndex) => (
        <section
          key={part.id}
          aria-labelledby={`${idPrefix}-${part.id}`}
          className={cn('flex flex-col gap-1', !compact && 'rounded-2xl border bg-card p-4 sm:p-5')}
        >
          {/* In the side navigation the part names are labels, so the chapter's h1 stays the first heading. */}
          <PartHeading
            id={`${idPrefix}-${part.id}`}
            className={cn('m-0 mb-1 font-semibold', compact ? 'text-caption text-muted-foreground' : 'text-lg')}
          >
            ส่วนที่ {partIndex + 1} · {part.title}
          </PartHeading>
          <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
            {chaptersInPart(part.id).map((chapter) => {
              const current = chapter.slug === currentSlug;
              const readable = isReadable(chapter);
              const body = (
                <>
                  <span className="w-7 shrink-0 font-semibold text-muted-foreground">{chapter.number}</span>
                  <span className="flex min-w-0 flex-col">
                    <span className={cn(current ? 'font-semibold' : 'font-medium')}>{chapter.title}</span>
                    {compact ? null : <span className="text-sm text-muted-foreground">{chapter.summary}</span>}
                    {readable ? null : <span className="text-caption text-muted-foreground">กำลังเขียน</span>}
                  </span>
                </>
              );
              const rowClass = cn('flex gap-2 rounded-lg px-2.5 py-2 leading-6', compact ? 'text-[0.9375rem]' : 'py-2.5');
              return (
                <li key={chapter.slug}>
                  {readable ? (
                    <Link
                      href={chapterPath(chapter)}
                      aria-current={current ? 'page' : undefined}
                      className={cn(rowClass, 'hover:bg-muted', current && 'bg-secondary text-secondary-foreground')}
                    >
                      {body}
                    </Link>
                  ) : (
                    <span className={cn(rowClass, 'text-muted-foreground')}>{body}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

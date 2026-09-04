'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BlogTableOfContentsItem } from '@/lib/sanitize';
import { cn } from '@/lib/utils';

interface Props {
  items: BlogTableOfContentsItem[];
  variant: 'mobile' | 'desktop';
}

export default function TableOfContents({ items, variant }: Props) {
  const [activeId, setActiveId] = useState('');
  const [open, setOpen] = useState(variant === 'desktop');
  const controlsId = `blog-toc-items-${variant}`;

  useEffect(() => {
    if (items.length === 0 || !('IntersectionObserver' in window)) return;

    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((heading): heading is HTMLElement => heading !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleHeading = entries.find((entry) => entry.isIntersecting);
        if (visibleHeading) setActiveId(visibleHeading.target.id);
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div data-toc-variant={variant} data-open={open || undefined}>
      <Button
        type={'button'}
        variant={'ghost'}
        className={'w-full justify-between px-2'}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={controlsId}
      >
        <span className={'inline-flex items-center gap-2'}>
          <List data-icon={'inline-start'} aria-hidden={true} />
          สารบัญบทความ ({items.length})
        </span>
        <ChevronDown
          data-icon={'inline-end'}
          className={cn('transition-transform motion-reduce:transition-none', open && 'rotate-180')}
          aria-hidden={true}
        />
      </Button>

      {open ? (
        <nav
          id={controlsId}
          className={'mt-3 flex flex-col gap-1 border-t pt-3'}
          aria-label={'หัวข้อในบทความ'}
        >
          {items.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={cn(
                'block rounded-lg px-3 py-2 text-sm leading-5 text-muted-foreground transition-colors motion-reduce:transition-none hover:bg-muted hover:text-foreground',
                item.level === 3 && 'pl-6 text-xs',
                activeId === item.id && 'bg-primary/10 font-semibold text-primary',
              )}
              data-active={activeId === item.id || undefined}
              aria-current={activeId === item.id ? 'location' : undefined}
              onClick={(event) => {
                event.preventDefault();
                const heading = document.getElementById(item.id);
                if (!heading) return;

                const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                heading.scrollIntoView({
                  behavior: reduceMotion ? 'auto' : 'smooth',
                  block: 'start',
                });
                heading.focus({ preventScroll: true });
                window.history.pushState(null, '', `#${item.id}`);
                setActiveId(item.id);
                if (variant === 'mobile') setOpen(false);
              }}
            >
              {item.text}
            </a>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

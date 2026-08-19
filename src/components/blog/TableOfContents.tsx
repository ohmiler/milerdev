'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

interface Props {
  contentHtml: string;
}

export default function TableOfContents({ contentHtml }: Props) {
  const [activeId, setActiveId] = useState<string>('');
  const [open, setOpen] = useState(true);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const items = useMemo<TocItem[]>(() => {
    const parsed: TocItem[] = [];
    const regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
    let match;
    let index = 0;
    while ((match = regex.exec(contentHtml)) !== null) {
      const rawText = match[1].replace(/<[^>]+>/g, '').trim();
      if (!rawText) continue;
      const id = `toc-${index}-${rawText.toLowerCase().replace(/[^a-z0-9ก-๙]+/g, '-').replace(/^-|-$/g, '')}`;
      parsed.push({ id, text: rawText, level: 2 });
      index += 1;
    }
    return parsed;
  }, [contentHtml]);

  useEffect(() => {
    if (items.length === 0) return;

    const realHeadings = document.querySelectorAll<HTMLElement>('.rich-content h2');
    realHeadings.forEach((heading, index) => {
      if (items[index]) heading.id = items[index].id;
    });

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    );

    realHeadings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [items]);

  if (isMobile === null || isMobile || items.length < 2) return null;

  return (
    <div data-open={open || undefined}>
      <Button
        type={'button'}
        variant="ghost"
        className="w-full justify-between px-2"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={'blog-toc-items'}
      >
        <span className="inline-flex items-center gap-2"><List />สารบัญบทความ</span>
        <ChevronDown className={cn('transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </Button>

      {open ? (
        <nav id="blog-toc-items" className="mt-3 space-y-1 border-t pt-3" aria-label="หัวข้อในบทความ">
          {items.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={cn('block rounded-lg px-3 py-2 text-sm leading-5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground', activeId === item.id && 'bg-primary/10 font-semibold text-primary')}
              data-active={activeId === item.id || undefined}
              aria-current={activeId === item.id ? 'location' : undefined}
              onClick={(event) => {
                event.preventDefault();
                const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                document.getElementById(item.id)?.scrollIntoView({
                  behavior: reduceMotion ? 'auto' : 'smooth',
                  block: 'start',
                });
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

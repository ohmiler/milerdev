'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

const HIDDEN_FROM = {
  md: 'md:hidden',
  lg: 'lg:hidden',
} as const;

type MobileActionBarProps = {
  /** Element that holds the real purchase or enrollment controls. */
  targetId: string;
  summary: string;
  hint?: string | null;
  actionLabel: string;
  /** In-page anchor such as "#course-action", or a route. */
  href: string;
  hiddenFrom: keyof typeof HIDDEN_FROM;
};

/**
 * Display-only shortcut for small screens. It never starts checkout or
 * enrollment itself; it only leads to the controls identified by targetId.
 */
export default function MobileActionBar({
  targetId,
  summary,
  hint = null,
  actionLabel,
  href,
  hiddenFrom,
}: MobileActionBarProps) {
  const [targetInView, setTargetInView] = useState<boolean | null>(null);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target || typeof IntersectionObserver === 'undefined') {
      queueMicrotask(() => setTargetInView(false));
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setTargetInView(entry.isIntersecting);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  const visible = targetInView === false;
  const hideClass = HIDDEN_FROM[hiddenFrom];
  const action = href.startsWith('#')
    ? <a href={href}>{actionLabel}</a>
    : <Link href={href}>{actionLabel}</Link>;

  return (
    <>
      <div aria-hidden="true" className={`${visible ? 'h-24' : 'h-0'} ${hideClass}`} />
      {visible ? (
        <section
          aria-label="ทางลัดไปส่วนสมัครเรียน"
          className={`fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-16px_rgb(15_23_42/0.35)] backdrop-blur ${hideClass}`}
        >
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-lg leading-6 font-semibold">{summary}</strong>
              {hint ? <span className="block truncate text-caption text-muted-foreground">{hint}</span> : null}
            </div>
            <Button asChild className="shrink-0">{action}</Button>
          </div>
        </section>
      ) : null}
    </>
  );
}

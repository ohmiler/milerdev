'use client';

import { useEffect, useRef, type ReactNode } from 'react';

// On phones the account menu is a scrolling row and later tabs start off screen,
// so the current tab is brought into view. Only the row scrolls, never the page.
export default function AccountTabs({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = ref.current;
    const current = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !current || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollLeft = current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2;
  }, []);

  return <nav ref={ref} className={className}>{children}</nav>;
}

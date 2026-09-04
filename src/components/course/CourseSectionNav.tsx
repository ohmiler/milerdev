'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface CourseSectionItem {
  id: string;
  label: string;
}

interface CourseSectionNavProps {
  items: CourseSectionItem[];
}

export default function CourseSectionNav({ items }: CourseSectionNavProps) {
  const [activeSection, setActiveSection] = useState(items[0]?.id ?? 'course-overview');

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => Boolean(section));

    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (visibleEntry) setActiveSection(visibleEntry.target.id);
      },
      { rootMargin: '-22% 0px -62% 0px', threshold: [0, 0.2, 0.6] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items]);

  const navigateToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sectionTop = section.getBoundingClientRect().top + window.scrollY - 118;
    window.scrollTo({ top: sectionTop, behavior: reduceMotion ? 'auto' : 'smooth' });
    window.history.replaceState(null, '', `#${sectionId}`);
    setActiveSection(sectionId);
  };

  return (
    <nav className="sticky top-[4.25rem] z-30 bg-background/92 backdrop-blur-xl supports-backdrop-filter:bg-background/80" aria-label="ส่วนต่าง ๆ ของคอร์ส">
      <div className="mx-auto max-w-5xl overflow-x-auto px-4 [scrollbar-width:none] sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden">
        <div
          className="grid h-14 min-w-max"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              aria-current={activeSection === item.id ? 'location' : undefined}
              onClick={(event) => {
                event.preventDefault();
                navigateToSection(item.id);
              }}
              className={cn(
                'relative inline-flex h-14 min-w-28 items-center justify-center px-3 text-center text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 motion-reduce:transition-none sm:min-w-0 sm:text-sm',
                activeSection === item.id
                  ? 'text-primary after:absolute after:inset-x-[calc(50%-1rem)] after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary'
                  : null,
              )}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}

'use client';

import { useEffect, useState } from 'react';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
      <Tabs value={activeSection} onValueChange={navigateToSection} className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <TabsList variant="line" className="grid h-14 w-full grid-cols-4 rounded-none p-0 group-data-horizontal/tabs:h-14">
          {items.map((item) => (
            <TabsTrigger key={item.id} value={item.id} className="h-14 min-w-0 px-1 text-xs data-active:text-primary group-data-horizontal/tabs:after:inset-x-auto group-data-horizontal/tabs:after:bottom-0 group-data-horizontal/tabs:after:left-[calc(50%-1rem)] after:w-8 after:rounded-full after:bg-primary sm:px-3 sm:text-sm">
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </nav>
  );
}

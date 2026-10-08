'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import type { FAQCategory, FAQItem } from '@/app/faq/faq-data';
import { FAQAnswer } from '@/components/faq/FAQAccordion';
import { Input } from '@/components/ui/input';

export type FAQMatch = { category: string; item: FAQItem };

/** Every word typed has to appear in the question or its answer. Null when nothing is typed. */
export function searchFaq(categories: FAQCategory[], query: string): FAQMatch[] | null {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  return categories.flatMap((category) => category.items
    .filter((item) => {
      const text = `${item.q} ${item.a}`.toLowerCase();
      return words.every((word) => text.includes(word));
    })
    .map((item) => ({ category: category.title, item })));
}

interface FAQSearchProps {
  categories: FAQCategory[];
  // The category links, shown beside the questions on wide screens.
  nav: ReactNode;
  // The questions by category, rendered on the server; replaced by the matches while a search is typed.
  children: ReactNode;
  // What follows either view: the way to ask the team.
  footer: ReactNode;
}

export default function FAQSearch({ categories, nav, children, footer }: FAQSearchProps) {
  const [query, setQuery] = useState('');
  const matches = searchFaq(categories, query);

  return (
    <div className="container grid gap-8 lg:grid-cols-[16rem_1fr] lg:items-start lg:gap-14">
      <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
        <search className="flex flex-col gap-2">
          <label htmlFor="faq-search" className="text-sm font-medium">ค้นหาคำถาม</label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="faq-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="เช่น คืนเงิน หรือ ใบรับรอง"
              autoComplete="off"
              className="h-11 bg-card pl-9"
            />
          </div>
        </search>
        <div className="hidden lg:block">{nav}</div>
      </aside>

      <div className="flex min-w-0 flex-col gap-12">
        {matches ? (
          <section aria-labelledby="faq-results-title">
            <h2 id="faq-results-title" className="text-h3 font-semibold" aria-live="polite">
              {matches.length > 0 ? `พบ ${matches.length} คำถาม` : `ไม่พบคำถามที่ตรงกับ “${query.trim()}”`}
            </h2>
            {matches.length > 0 ? (
              <ul className="mt-5 flex flex-col gap-3">
                {matches.map(({ category, item }) => (
                  <li key={item.q} className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
                    <p className="text-caption font-medium text-link">{category}</p>
                    <h3 className="mt-1 text-base leading-7 font-semibold">{item.q}</h3>
                    <div className="mt-2 text-sm leading-7 text-muted-foreground sm:text-base">
                      <FAQAnswer item={item} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-muted-foreground">
                ลองใช้คำอื่น หรือ{' '}
                <Link className="font-medium text-link hover:underline" href="/contact">ถามทีมโดยตรง</Link>
              </p>
            )}
          </section>
        ) : children}
        {footer}
      </div>
    </div>
  );
}

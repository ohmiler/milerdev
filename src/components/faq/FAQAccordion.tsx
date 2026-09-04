'use client';

import Link from 'next/link';
import type { FAQItem } from '@/app/faq/faq-data';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface FAQAccordionProps {
  categoryIndex: number;
  items: FAQItem[];
}

export function FAQAnswer({ item }: { item: FAQItem }) {
  return (
    <div className={'flex flex-col gap-3'}>
      <p>{item.a}</p>
      {item.link ? (
        <Link className={'w-fit font-medium text-primary'} href={item.link.href}>
          {item.link.label} <span aria-hidden={true}>→</span>
        </Link>
      ) : null}
    </div>
  );
}

export default function FAQAccordion({ categoryIndex, items }: FAQAccordionProps) {
  return (
    <Accordion type={'multiple'} className={'rounded-2xl border bg-card px-5 shadow-sm sm:px-6'}>
      {items.map((item, itemIndex) => (
        <AccordionItem key={item.q} value={`faq-${categoryIndex}-${itemIndex}`}>
          <AccordionTrigger className={'py-5 text-left text-base leading-7 font-semibold hover:no-underline'}>
            {item.q}
          </AccordionTrigger>
          <AccordionContent className={'pb-5 text-sm leading-7 text-muted-foreground sm:text-base'}>
            <FAQAnswer item={item} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

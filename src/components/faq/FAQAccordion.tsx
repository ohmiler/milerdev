'use client';

import type { FAQItem } from '@/app/faq/faq-data';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface FAQAccordionProps { categoryIndex: number; items: FAQItem[] }

export default function FAQAccordion({ categoryIndex, items }: FAQAccordionProps) {
  return (
    <Accordion type="multiple" className="rounded-2xl border bg-card px-5 shadow-sm sm:px-6">
      {items.map((item, itemIndex) => (
        <AccordionItem key={item.q} value={`faq-${categoryIndex}-${itemIndex}`}>
          <AccordionTrigger className="py-5 text-left text-base leading-7 font-semibold hover:no-underline">{item.q}</AccordionTrigger>
          <AccordionContent className="pb-5 text-sm leading-7 text-muted-foreground sm:text-base"><p>{item.a}</p></AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

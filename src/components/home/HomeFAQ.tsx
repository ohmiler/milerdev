'use client';

import type { FAQItem } from '@/app/faq/faq-data';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface HomeFAQProps {
  items: FAQItem[];
}

export default function HomeFAQ({ items }: HomeFAQProps) {
  return (
    <Accordion
      type="single"
      collapsible
      className="rounded-[1.75rem] border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,35,58,0.07)]"
    >
      {items.map((item, index) => (
        <AccordionItem key={item.q} value={`home-faq-${index + 1}`}>
          <AccordionTrigger className="p-5 text-base leading-7 font-semibold text-slate-950 no-underline hover:no-underline sm:p-6">
            <span>{item.q}</span>
          </AccordionTrigger>
          <AccordionContent className="px-2 pb-2 text-sm leading-7 text-slate-600 sm:px-3 sm:text-base">
            <p>{item.a}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

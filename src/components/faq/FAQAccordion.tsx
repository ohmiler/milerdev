'use client';

import { useState } from 'react';
import type { FAQItem } from '@/app/faq/faq-data';
import styles from '@/app/faq/faq.module.css';

interface FAQAccordionProps {
  categoryIndex: number;
  items: FAQItem[];
}

export default function FAQAccordion({ categoryIndex, items }: FAQAccordionProps) {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (itemIndex: number) => {
    setOpenItems((current) => (
      current.includes(itemIndex)
        ? current.filter((index) => index !== itemIndex)
        : [...current, itemIndex]
    ));
  };

  return (
    <div className={styles.accordion}>
      {items.map((item, itemIndex) => {
        const open = openItems.includes(itemIndex);
        const itemKey = `${categoryIndex}-${itemIndex}`;
        const buttonId = `faq-question-${itemKey}`;
        const panelId = `faq-answer-${itemKey}`;

        return (
          <div className={styles.item} data-open={open || undefined} key={item.q}>
            <h3>
              <button
                id={buttonId}
                type={'button'}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggleItem(itemIndex)}
              >
                <span>{item.q}</span>
                <svg viewBox={'0 0 24 24'} fill={'none'} stroke={'currentColor'} strokeWidth={2} aria-hidden={true}>
                  <path d={'M6 9l6 6 6-6'} />
                </svg>
              </button>
            </h3>
            <div
              id={panelId}
              role={'region'}
              aria-labelledby={buttonId}
              className={styles.answer}
              hidden={!open}
            >
              <p>{item.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { HOME_FAQ_ITEMS } from '@/app/faq/faq-data';
import HomeFAQ from '@/components/home/HomeFAQ';

describe('Home FAQ', () => {
  it('reuses the five canonical pre-purchase answers', () => {
    expect(HOME_FAQ_ITEMS.map((item) => item.q)).toEqual([
      'ต้องมีพื้นฐานการเขียนโปรแกรมก่อนไหม?',
      'เรียนได้ตลอดชีพหรือมีกำหนดเวลา?',
      'มีใบรับรอง (Certificate) ให้ไหม?',
      'ชำระเงินได้ช่องทางไหนบ้าง?',
      'ชำระเงินแล้วได้เรียนเลยไหม?',
    ]);

    const markup = renderToStaticMarkup(<HomeFAQ items={HOME_FAQ_ITEMS} />);

    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('ชำระเงินได้ช่องทางไหนบ้าง?');
    expect(HOME_FAQ_ITEMS.find((item) => item.q === 'ชำระเงินได้ช่องทางไหนบ้าง?')?.a).toContain('PromptPay');
    expect(HOME_FAQ_ITEMS.find((item) => item.q === 'ชำระเงินได้ช่องทางไหนบ้าง?')?.a).toContain('Stripe');
  });
});

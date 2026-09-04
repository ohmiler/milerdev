import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import BundlePriceSummary from '@/components/bundle/BundlePriceSummary';
import { deriveBundleDecisionFacts } from '@/lib/bundle-decision-facts';

describe('BundlePriceSummary', () => {
  it('uses current separate prices for savings and regular prices as secondary context', () => {
    const facts = deriveBundleDecisionFacts({
      slug: 'full-stack',
      price: '1500.00',
      courses: [
        {
          id: 'typescript',
          title: 'TypeScript',
          slug: 'typescript',
          orderIndex: 0,
          regularPrice: '1000.00',
          promotion: { price: '800.00' },
          lessonCount: 6,
        },
        {
          id: 'nextjs',
          title: 'Next.js',
          slug: 'nextjs',
          orderIndex: 1,
          regularPrice: '1200.00',
          lessonCount: 8,
        },
      ],
    }, { now: new Date('2026-09-02T05:00:00.000Z') });

    const html = renderToStaticMarkup(<BundlePriceSummary price={facts.price} />);

    expect(html).toContain('ราคาชุด');
    expect(html).toContain('฿1,500');
    expect(html).toContain('ซื้อแยกวันนี้');
    expect(html).toContain('฿2,000');
    expect(html).toContain('ประหยัด ฿500 (25%)');
    expect(html).toContain('ราคาปกติรวม');
    expect(html).toContain('฿2,200');
    expect(html).not.toMatch(/<s(?:\s|>)/);
  });
});

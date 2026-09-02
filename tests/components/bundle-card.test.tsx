import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import BundleCard from '@/components/bundle/BundleCard';
import { deriveBundleDecisionFacts } from '@/lib/bundle-decision-facts';

function decisionFacts(overrides: {
  bundlePrice?: string;
  secondLessonCount?: number;
} = {}) {
  return deriveBundleDecisionFacts({
    slug: 'full-stack',
    price: overrides.bundlePrice ?? '1500.00',
    courses: [
      {
        id: 'second',
        title: 'Next.js',
        slug: 'nextjs',
        orderIndex: 20,
        regularPrice: '1200.00',
        lessonCount: overrides.secondLessonCount ?? 8,
      },
      {
        id: 'first',
        title: 'TypeScript',
        slug: 'typescript',
        orderIndex: 10,
        regularPrice: '1000.00',
        promotion: { price: '800.00' },
        lessonCount: 6,
      },
    ],
  }, { now: new Date('2026-09-02T05:00:00.000Z') });
}

describe('BundleCard', () => {
  it('renders the authoritative Course order and current comparison facts', () => {
    const html = renderToStaticMarkup(
      <BundleCard
        title="Full-stack path"
        description="เรียนตามลำดับ"
        decisionFacts={decisionFacts()}
      />,
    );

    expect(html).toContain('ประหยัด ฿500 (25%)');
    expect(html).toContain('ซื้อแยกวันนี้ ฿2,000');
    expect(html.indexOf('TypeScript')).toBeLessThan(html.indexOf('Next.js'));
    expect(html).not.toContain('รีวิว');
  });

  it('keeps an unready Bundle card discoverable without presenting savings as availability', () => {
    const html = renderToStaticMarkup(
      <BundleCard
        title="Preparing path"
        description={null}
        decisionFacts={decisionFacts({ secondLessonCount: 0 })}
      />,
    );

    expect(html).toContain('href="/bundles/full-stack"');
    expect(html).toContain('กำลังเตรียมเนื้อหา');
    expect(html).toContain('ดูรายละเอียด');
  });
});

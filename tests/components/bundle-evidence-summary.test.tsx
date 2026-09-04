import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import BundleEvidenceSummary from '@/components/bundle/BundleEvidenceSummary';

describe('BundleEvidenceSummary', () => {
  it('renders decision evidence without repeating price claims in the hero', () => {
    const html = renderToStaticMarkup(
      <BundleEvidenceSummary
        evidence={{
          courseCount: 3,
          totalLessons: 48,
          knownDurationSeconds: 33_600,
          freePreviewCount: 4,
        }}
      />,
    );

    expect(html).toContain('3 คอร์ส');
    expect(html).toContain('48 บทเรียน');
    expect(html).toContain('9 ชม. 20 นาที');
    expect(html).toContain('ทดลองเรียน 4 บท');
    expect(html).not.toContain('ราคา');
    expect(html.match(/<dt\b/g)).toHaveLength(4);
    expect(html.match(/<dd\b/g)).toHaveLength(4);
  });
});

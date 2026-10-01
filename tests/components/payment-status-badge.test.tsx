import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import PaymentStatusBadge from '@/components/proof/PaymentStatusBadge';

const states = [
  'completed-ready',
  'completed-access-pending',
  'pending',
  'verifying',
  'failed',
  'refunded',
  'cancelled-return',
  'unconfirmed',
] as const;

describe('payment status badge', () => {
  it.each(states)('shows an icon and the Thai label for %s', (state) => {
    const html = renderToStaticMarkup(<PaymentStatusBadge state={state} label="ป้ายสถานะ" />);

    expect(html).toContain(`data-payment-status="${state}"`);
    expect(html).toContain('ป้ายสถานะ');
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
  });

  it('gives the states people act on their own color, not only a label', () => {
    const variantOf = (state: (typeof states)[number]) => renderToStaticMarkup(<PaymentStatusBadge state={state} label="x" />)
      .match(/bg-[\w-]+/)?.[0];

    const distinct = new Set(['completed-ready', 'pending', 'verifying', 'failed', 'refunded'].map((state) => variantOf(state as (typeof states)[number])));
    expect(distinct.size).toBe(5);
  });
});

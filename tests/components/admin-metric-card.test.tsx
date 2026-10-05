import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AdminMetricCard } from '@/components/admin/ui/AdminOperations';

describe('AdminMetricCard', () => {
  it('stays a plain card without a destination', () => {
    const html = renderToStaticMarkup(<AdminMetricCard label="คอร์สที่เผยแพร่" value="12" />);

    expect(html).not.toContain('<a ');
    expect(html).toContain('คอร์สที่เผยแพร่');
  });

  it('links the whole card, number included, to the list it counts', () => {
    const html = renderToStaticMarkup(<AdminMetricCard label="การชำระเงินที่ต้องตรวจ" value="3" href="/admin/reconciliation?status=verifying" />);
    const link = html.slice(html.indexOf('<a '), html.lastIndexOf('</a>'));

    expect(link).toContain('href="/admin/reconciliation?status=verifying"');
    expect(link).toContain('การชำระเงินที่ต้องตรวจ');
    expect(link).toContain('>3<');
  });
});

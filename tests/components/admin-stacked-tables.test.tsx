import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { adminStackedTableClass } from '@/components/admin/ui/AdminOperations';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('admin tables on phones', () => {
  it('lets a cell carry the column name its phone card shows', () => {
    const html = renderToStaticMarkup(
      <Table className={adminStackedTableClass}>
        <TableBody><TableRow><TableCell data-label="จำนวน">฿990</TableCell></TableRow></TableBody>
      </Table>,
    );

    expect(html).toContain('data-label="จำนวน"');
    expect(html).toContain('max-md:[&amp;_td]:before:content-[attr(data-label)]');
  });

  it.each([
    ['src/app/admin/payments/page.tsx', ['รายการ', 'จำนวน', 'ช่องทาง', 'สถานะ', 'เวลา']],
    ['src/app/admin/users/page.tsx', ['บทบาท', 'สถานะ', 'คอร์ส', 'วันที่สมัคร']],
    ['src/app/admin/enrollments/page.tsx', ['คอร์ส', 'ความคืบหน้า', 'วันที่ลงทะเบียน', 'สถานะ', 'จัดการ']],
  ])('%s stacks its rows and names each narrow cell', (path, labels) => {
    const page = source(path);

    expect(page).toContain('<Table className={adminStackedTableClass}>');
    for (const label of labels) expect(page).toContain(`data-label="${label}"`);
  });
});

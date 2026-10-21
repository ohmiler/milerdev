import { describe, expect, it } from 'vitest';

import { csvCell } from '@/lib/security/csv';

// Splits one CSV line into cells, honoring quotes, the way a spreadsheet reads it.
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') { cell += '"'; index++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { cells.push(cell); cell = ''; }
    else cell += char;
  }
  cells.push(cell);
  return cells;
}

describe('csvCell', () => {
  it('leaves plain values alone and renders null as an empty cell', () => {
    expect(csvCell('Somchai')).toBe('Somchai');
    expect(csvCell(42)).toBe('42');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('quotes values with commas, quotes or line breaks', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line\nbreak')).toBe('"line\nbreak"');
  });

  it('turns a formula into text', () => {
    for (const formula of ['=1+1', '+1', '-1', '@SUM(A1)', '\tx', '\rx']) {
      expect(csvCell(formula).replace(/^"|"$/g, '').startsWith("'")).toBe(true);
    }
  });

  it('still quotes a prefixed formula, so a comma inside it cannot start a new formula cell', () => {
    const name = '-x,=HYPERLINK("https://attacker.example","open")';

    const cell = csvCell(name);
    const cells = parseCsvLine(`${cell},next`);

    expect(cells).toEqual([`'${name}`, 'next']);
    expect(cells.some((value) => /^[=+\-@]/.test(value))).toBe(false);
  });
});

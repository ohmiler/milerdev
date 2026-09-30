// Preserve password cells verbatim, including spaces and escaped quotes.
// Reject malformed CSV instead of silently changing credentials.
export function parseUserImportCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let closed = false;
  const finishCell = () => { row.push(cell); cell = ''; closed = false; };
  const finishRow = () => {
    finishCell();
    if (row.some((value) => value !== '')) rows.push(row);
    row = [];
  };
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (quoted) {
      if (char === '"') {
        if (content[i + 1] === '"') { cell += '"'; i++; }
        else { quoted = false; closed = true; }
      } else cell += char;
    } else if (char === ',') finishCell();
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && content[i + 1] === '\n') i++;
      finishRow();
    } else if (char === '"' && cell === '' && !closed) quoted = true;
    else {
      if (char === '"' || closed) throw new Error('Malformed CSV');
      cell += char;
    }
  }
  if (quoted) throw new Error('Malformed CSV');
  finishRow();
  return rows;
}

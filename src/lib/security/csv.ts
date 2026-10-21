/**
 * One CSV cell, safe to open in a spreadsheet.
 *
 * A value that starts with = + - @ tab or CR is prefixed with ' so a spreadsheet shows it as
 * text instead of running it as a formula. Quoting runs after the prefix, never instead of it: a
 * prefixed value that also contains a comma, quote or line break must still be quoted, or the
 * break starts a new cell that can begin with a formula of its own.
 */
export function csvCell(value: string | number | null | undefined): string {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[,"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

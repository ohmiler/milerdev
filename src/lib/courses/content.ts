// Structured course content that an admin writes for the course page (ADR 0005, Phase 2): a short
// summary and three lists. The page shows a group only when it has content, and never derives
// these from the rich description.

export const COURSE_SUMMARY_MAX = 300;
export const COURSE_CONTENT_ITEM_MAX = 200;
export const COURSE_CONTENT_LIST_MAX = 8;

/** The admin form edits each list as text, one item per line. */
export function contentLinesToList(text: string): string[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export function contentListToLines(list: readonly string[] | null | undefined): string {
  return (list ?? []).join('\n');
}

/** A list as stored: trimmed items without blanks, or null when nothing is left. */
export function normalizeContentList(list: readonly string[] | null | undefined): string[] | null {
  const items = (list ?? []).map((item) => item.trim()).filter(Boolean);
  return items.length > 0 ? items : null;
}

/** A summary as stored: trimmed, or null when blank. */
export function normalizeSummary(summary: string | null | undefined): string | null {
  const trimmed = summary?.trim() ?? '';
  return trimmed ? trimmed : null;
}

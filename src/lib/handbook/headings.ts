// Section ids for a chapter's "ในหน้านี้" list. The MDX h2 component and the list both derive the id
// from the heading text with headingId, so the two cannot drift apart.

export interface HandbookSection {
  id: string;
  title: string;
}

/** Keeps letters (with Thai vowel and tone marks), digits and hyphens; spaces become hyphens. */
export function headingId(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

/** The level-2 headings of an MDX source, in order, skipping fenced code blocks. */
export function extractSections(source: string): HandbookSection[] {
  const sections: HandbookSection[] = [];
  let inFence = false;
  for (const line of source.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = /^## (.+?)\s*$/.exec(line);
    if (!match) continue;
    const title = match[1].replace(/[*_`]/g, '');
    sections.push({ id: headingId(title), title });
  }
  return sections;
}

// The handbook's table of contents and review state (ADR 0016).
// A chapter's body lives in src/content/handbook/<slug>.mdx once it is drafted.

import { FOUNDER } from '@/lib/content/founder';

export type HandbookPartId = 'foundations' | 'agents' | 'shipping';

/**
 * planned: listed as being written, no page yet.
 * draft: written and awaiting the owner's review; served by the development server only.
 * published: approved by the owner; served everywhere.
 */
export type HandbookChapterStatus = 'planned' | 'draft' | 'published';

export interface HandbookPart {
  id: HandbookPartId;
  title: string;
}

export interface HandbookChapter {
  number: number;
  slug: string;
  title: string;
  summary: string;
  part: HandbookPartId;
  status: HandbookChapterStatus;
  readingMinutes?: number;
  /** ISO date of the last reviewed change, required once published. */
  updatedAt?: string;
  /** Who reviewed the AI draft, required once published. */
  reviewedBy?: string;
}

export const HANDBOOK_TITLE = 'คู่มือ Dev ยุค AI';
export const HANDBOOK_DESCRIPTION =
  'คู่มือฟรีสำหรับคนที่ยังไม่เคยเขียนโค้ด เข้าใจพื้นฐานที่ AI ทำแทนไม่ได้ แล้วฝึกสั่งงาน ตรวจงาน และส่งงานขึ้นใช้จริงร่วมกับ AI agent ทีละขั้น';

/**
 * Off until the owner launches the handbook (ADR 0016, decision 7). While off, pages ask search
 * engines not to index them, and the handbook stays out of the navigation and the sitemap.
 */
export const HANDBOOK_LAUNCHED = false;

export const HANDBOOK_PARTS: HandbookPart[] = [
  { id: 'foundations', title: 'พื้นฐานที่ต้องเข้าใจเอง' },
  { id: 'agents', title: 'ทำงานกับ AI agent' },
  { id: 'shipping', title: 'ส่งงานขึ้นใช้จริง' },
];

export const HANDBOOK_CHAPTERS: HandbookChapter[] = [
  { number: 1, slug: 'developers-in-the-ai-era', title: 'Dev ทำอะไร ในยุคที่ AI เขียนโค้ดได้', summary: 'งานที่เปลี่ยนไป และงานที่ยังเป็นของคน', part: 'foundations', status: 'published', readingMinutes: 8, updatedAt: '2026-10-09', reviewedBy: FOUNDER.name },
  { number: 2, slug: 'what-is-code', title: 'โค้ดคืออะไร', summary: 'คอมพิวเตอร์ทำตามคำสั่งทีละบรรทัดยังไง', part: 'foundations', status: 'published', readingMinutes: 10, updatedAt: '2026-10-09', reviewedBy: FOUNDER.name },
  { number: 3, slug: 'how-the-web-works', title: 'เว็บทำงานยังไง', summary: 'เบราว์เซอร์ เซิร์ฟเวอร์ และฐานข้อมูล', part: 'foundations', status: 'published', readingMinutes: 10, updatedAt: '2026-10-09', reviewedBy: FOUNDER.name },
  { number: 4, slug: 'first-developer-tools', title: 'เครื่องมือแรกของ dev', summary: 'editor, terminal และ Git แบบภาพรวม', part: 'foundations', status: 'published', readingMinutes: 10, updatedAt: '2026-10-09', reviewedBy: FOUNDER.name },
  { number: 5, slug: 'what-is-an-ai-agent', title: 'AI agent คืออะไร', summary: 'ต่างจากแชตบอตตรงที่ลงมือทำงานได้เอง', part: 'agents', status: 'published', readingMinutes: 10, updatedAt: '2026-10-09', reviewedBy: FOUNDER.name },
  {
    number: 6,
    slug: 'writing-prompts-for-agents',
    title: 'เขียนโจทย์ให้ agent',
    summary: 'เป้าหมาย บริบท ขอบเขต และเกณฑ์รับงาน',
    part: 'agents',
    status: 'published',
    readingMinutes: 10,
    updatedAt: '2026-10-09',
    reviewedBy: FOUNDER.name,
  },
  { number: 7, slug: 'reviewing-agent-work', title: 'ตรวจงานที่ agent ทำ', summary: 'แม้ยังอ่านโค้ดไม่คล่อง', part: 'agents', status: 'published', readingMinutes: 10, updatedAt: '2026-10-09', reviewedBy: FOUNDER.name },
  { number: 8, slug: 'tests', title: 'เทสต์: ให้เครื่องช่วยตรวจ', summary: 'เขียนครั้งเดียว ตรวจซ้ำได้ทุกครั้ง', part: 'agents', status: 'published', readingMinutes: 10, updatedAt: '2026-10-09', reviewedBy: FOUNDER.name },
  { number: 9, slug: 'security-basics', title: 'ความปลอดภัย', summary: 'รหัสลับ สิทธิ์ และคำสั่งแฝงในข้อมูล', part: 'agents', status: 'published', readingMinutes: 10, updatedAt: '2026-10-09', reviewedBy: FOUNDER.name },
  { number: 10, slug: 'git-and-pull-requests', title: 'เก็บงานด้วย Git และ Pull Request', summary: 'ย้อนกลับได้ทุกครั้งที่พลาด', part: 'shipping', status: 'planned' },
  { number: 11, slug: 'shipping-to-production', title: 'เอางานขึ้นเว็บจริง', summary: 'และย้อนกลับเมื่อมีอะไรพัง', part: 'shipping', status: 'planned' },
];

/** Drafts are readable only outside production builds, so the owner can review them locally. */
export function isReadable(chapter: HandbookChapter, environment: string | undefined = process.env.NODE_ENV): boolean {
  if (chapter.status === 'published') return true;
  return chapter.status === 'draft' && environment !== 'production';
}

export function getReadableChapters(
  environment?: string,
  chapters: HandbookChapter[] = HANDBOOK_CHAPTERS,
): HandbookChapter[] {
  return chapters.filter((chapter) => isReadable(chapter, environment));
}

export function findReadableChapter(slug: string, environment?: string): HandbookChapter | undefined {
  return HANDBOOK_CHAPTERS.find((chapter) => chapter.slug === slug && isReadable(chapter, environment));
}

export function chaptersInPart(part: HandbookPartId): HandbookChapter[] {
  return HANDBOOK_CHAPTERS.filter((chapter) => chapter.part === part);
}

/** The nearest readable chapters before and after, skipping ones that are still being written. */
export function getChapterNeighbours(
  slug: string,
  environment?: string,
  chapters: HandbookChapter[] = HANDBOOK_CHAPTERS,
): {
  previous: HandbookChapter | undefined;
  next: HandbookChapter | undefined;
} {
  const readable = getReadableChapters(environment, chapters);
  const index = readable.findIndex((chapter) => chapter.slug === slug);
  if (index === -1) return { previous: undefined, next: undefined };
  return { previous: readable[index - 1], next: readable[index + 1] };
}

export function chapterPath(chapter: Pick<HandbookChapter, 'slug'>): string {
  return `/handbook/${chapter.slug}`;
}

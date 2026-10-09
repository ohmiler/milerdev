import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { HandbookChapterList } from '@/components/handbook/HandbookChapterList';
import Footer from '@/components/layout/Footer';
import MainContent from '@/components/layout/MainContent';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import {
  chapterPath,
  findReadableChapter,
  getChapterNeighbours,
  getReadableChapters,
  HANDBOOK_CHAPTERS,
  HANDBOOK_LAUNCHED,
  HANDBOOK_PARTS,
  HANDBOOK_TITLE,
} from '@/lib/handbook/chapters';
import { extractSections } from '@/lib/handbook/headings';
import { DEFAULT_OG_IMAGE } from '@/lib/content/seo';

interface ChapterPageProps {
  params: Promise<{ slug: string }>;
}

// Every readable chapter is prerendered; any other slug is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return getReadableChapters().map((chapter) => ({ slug: chapter.slug }));
}

export async function generateMetadata({ params }: ChapterPageProps): Promise<Metadata> {
  const { slug } = await params;
  const chapter = findReadableChapter(slug);
  if (!chapter) return {};
  const url = chapterPath(chapter);
  const description = `${chapter.title}: ${chapter.summary} จาก${HANDBOOK_TITLE} คู่มือฟรีสำหรับคนที่เริ่มจากศูนย์`;
  return {
    title: `${chapter.title} | ${HANDBOOK_TITLE}`,
    description,
    alternates: { canonical: url },
    robots: HANDBOOK_LAUNCHED && chapter.status === 'published' ? undefined : { index: false, follow: false },
    openGraph: { title: chapter.title, description, url, siteName: 'MilerDev', type: 'article', images: [DEFAULT_OG_IMAGE] },
  };
}

const updatedFormat = new Intl.DateTimeFormat('th-TH', { dateStyle: 'long', timeZone: 'Asia/Bangkok' });

export default async function HandbookChapterPage({ params }: ChapterPageProps) {
  const { slug } = await params;
  const chapter = findReadableChapter(slug);
  if (!chapter) notFound();

  const { default: Content } = await import(`@/content/handbook/${slug}.mdx`);
  // Read at build time, when the page is prerendered, for the "ในหน้านี้" list.
  const source = await readFile(path.join(process.cwd(), 'src/content/handbook', `${slug}.mdx`), 'utf8');
  const sections = extractSections(source);
  const { previous, next } = getChapterNeighbours(slug);
  const part = HANDBOOK_PARTS.find((candidate) => candidate.id === chapter.part);
  const details = [
    `บทที่ ${chapter.number} จาก ${HANDBOOK_CHAPTERS.length}`,
    chapter.readingMinutes ? `อ่านราว ${chapter.readingMinutes} นาที` : null,
    chapter.updatedAt ? `อัปเดต ${updatedFormat.format(new Date(`${chapter.updatedAt}T00:00:00+07:00`))}` : null,
  ].filter(Boolean);

  return (
    <>
      <Navbar />
      <MainContent className="bg-background">
        <div className="mx-auto flex w-full max-w-[84rem] items-start gap-10 px-4 py-8 sm:px-6 lg:py-12">
          <nav aria-label="สารบัญคู่มือ" className="sticky top-24 hidden max-h-[calc(100vh-7rem)] w-60 shrink-0 overflow-y-auto lg:block">
            <Link href="/handbook" className="mb-4 block px-2.5 font-semibold text-foreground hover:text-link">{HANDBOOK_TITLE}</Link>
            <HandbookChapterList currentSlug={chapter.slug} compact idPrefix="handbook-nav" />
          </nav>

          <article className="min-w-0 max-w-3xl flex-1 text-[1.0625rem] leading-8">
            <details className="mb-6 rounded-xl border px-4 lg:hidden">
              <summary className="flex min-h-11 cursor-pointer items-center text-base font-semibold">
                สารบัญคู่มือ · บทที่ {chapter.number} จาก {HANDBOOK_CHAPTERS.length}
              </summary>
              <div className="pb-4">
                <HandbookChapterList currentSlug={chapter.slug} compact idPrefix="handbook-mobile-nav" />
              </div>
            </details>

            <nav aria-label="ตำแหน่งในคู่มือ" className="text-sm leading-6 text-muted-foreground">
              <Link href="/handbook" className="text-link underline underline-offset-4">{HANDBOOK_TITLE}</Link>
              <span aria-hidden="true"> / </span>
              <span>{part?.title}</span>
            </nav>

            <header className="mt-3 flex flex-col gap-3">
              <h1 className="m-0 text-h1 font-bold">{chapter.title}</h1>
              <p className="m-0 text-sm leading-6 text-muted-foreground">{details.join(' · ')} · ระดับเริ่มต้น</p>
            </header>

            <Content />

            <nav aria-label="บทก่อนหน้าและถัดไป" className="mt-14 grid gap-4 sm:grid-cols-2">
              {previous ? (
                <Link href={chapterPath(previous)} className="flex flex-col gap-1 rounded-xl border px-5 py-4 leading-6 hover:bg-muted">
                  <span className="text-sm text-muted-foreground">← บทก่อนหน้า</span>
                  <span className="font-semibold">{previous.number}. {previous.title}</span>
                </Link>
              ) : <span />}
              {next ? (
                <Link href={chapterPath(next)} className="flex flex-col items-end gap-1 rounded-xl border px-5 py-4 text-right leading-6 hover:bg-muted">
                  <span className="text-sm text-muted-foreground">บทถัดไป →</span>
                  <span className="font-semibold">{next.number}. {next.title}</span>
                </Link>
              ) : null}
            </nav>

            <aside aria-label="คอร์สที่เกี่ยวข้อง" className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[var(--color-accent-soft)] px-6 py-5 leading-7">
              <div className="flex flex-col">
                <strong className="font-semibold">อยากฝึกกับโปรเจคจริงพร้อมผู้สอน</strong>
                <span className="text-base">คู่มือให้พื้นฐานฟรี ส่วนคอร์สพาทำงานจริงตั้งแต่ต้นจนจบ</span>
              </div>
              <Button asChild>
                <Link href="/courses">ดูคอร์ส</Link>
              </Button>
            </aside>

            <footer className="mt-10 border-t pt-5 text-sm leading-7 text-muted-foreground">
              {chapter.status === 'published'
                ? `ร่างโดย AI แล้วตรวจและแก้โดย ${chapter.reviewedBy}`
                : 'ฉบับร่างโดย AI ยังไม่ผ่านการตรวจ และยังไม่เผยแพร่'}
              {' · '}เจอจุดที่ผิดหรือล้าสมัย?{' '}
              <Link href="/contact" className="text-link underline underline-offset-4">แจ้งเรา</Link>
            </footer>
          </article>

          {sections.length > 0 ? (
            <aside aria-label="ในหน้านี้" className="sticky top-24 hidden w-52 shrink-0 xl:block">
              <p className="mb-2 text-caption font-semibold text-muted-foreground">ในหน้านี้</p>
              <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm leading-6">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`} className="block py-1 text-muted-foreground hover:text-foreground">{section.title}</a>
                  </li>
                ))}
              </ul>
            </aside>
          ) : null}
        </div>
      </MainContent>
      <Footer />
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { HandbookChapterList } from '@/components/handbook/HandbookChapterList';
import Footer from '@/components/layout/Footer';
import MainContent from '@/components/layout/MainContent';
import Navbar from '@/components/layout/Navbar';
import PublicPageHeader from '@/components/layout/PublicPageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  chapterPath,
  getReadableChapters,
  HANDBOOK_CHAPTERS,
  HANDBOOK_DESCRIPTION,
  HANDBOOK_LAUNCHED,
  HANDBOOK_TITLE,
} from '@/lib/handbook/chapters';
import { DEFAULT_OG_IMAGE } from '@/lib/content/seo';

export const metadata: Metadata = {
  title: HANDBOOK_TITLE,
  description: HANDBOOK_DESCRIPTION,
  alternates: { canonical: '/handbook' },
  // Kept out of search results until the owner launches the handbook (ADR 0016, decision 7).
  robots: HANDBOOK_LAUNCHED ? undefined : { index: false, follow: false },
  openGraph: {
    title: HANDBOOK_TITLE,
    description: HANDBOOK_DESCRIPTION,
    url: '/handbook',
    siteName: 'MilerDev',
    images: [DEFAULT_OG_IMAGE],
  },
};

const outcomes = [
  'อธิบายได้ว่าเว็บหนึ่งหน้าทำงานยังไงตั้งแต่กดลิงก์',
  'เขียนโจทย์ให้ AI agent จนได้งานที่ตรวจได้ว่าเสร็จจริง',
  'ตรวจงานที่ AI ทำ โดยไม่ต้องเชื่อคำว่า "เสร็จแล้ว"',
  'เก็บงานด้วย Git และเอาเว็บขึ้นใช้จริงได้เอง',
];

export default function HandbookPage() {
  const firstReadable = getReadableChapters()[0];

  return (
    <>
      <Navbar />
      <MainContent className="bg-[var(--academy-canvas)]">
        <PublicPageHeader
          variant="story"
          title={HANDBOOK_TITLE}
          description="เริ่มจากศูนย์ เข้าใจพื้นฐานที่ AI ทำแทนไม่ได้ แล้วฝึกสั่งงาน ตรวจงาน และส่งงานขึ้นใช้จริงร่วมกับ AI agent ทีละขั้น เขียนให้คนที่ยังไม่เคยเขียนโค้ดอ่านเข้าใจ"
          evidence={
            <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6">
              <Badge variant="secondary" className="self-start text-sm">ฟรี · ไม่ต้องสมัครสมาชิก</Badge>
              <p className="m-0 font-semibold">อ่านจบเส้นทางแรกแล้ว คุณจะ</p>
              <ul className="m-0 flex list-disc flex-col gap-2 pl-5 leading-7 text-muted-foreground">
                {outcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}
              </ul>
              {firstReadable ? (
                <Button asChild className="self-start">
                  <Link href={chapterPath(firstReadable)}>
                    อ่านบท {firstReadable.title}
                    <ArrowRight data-icon="inline-end" aria-hidden />
                  </Link>
                </Button>
              ) : null}
            </div>
          }
        />

        <section aria-labelledby="handbook-path" className="py-12 sm:py-16">
          <div className="container flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <h2 id="handbook-path" className="m-0 text-h2 font-semibold">เส้นทางแรก: เริ่มจากศูนย์</h2>
              <p className="m-0 text-muted-foreground">
                {HANDBOOK_CHAPTERS.length} บท อ่านตามลำดับ บทที่ยังไม่มีลิงก์กำลังเขียนและรอผู้สอนตรวจ
              </p>
            </div>
            <HandbookChapterList />
          </div>
        </section>

        <section aria-label="เกี่ยวกับคู่มือ" className="pb-16 sm:pb-20">
          <div className="container grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-2xl border bg-card p-6">
              <h2 className="m-0 text-h3 font-semibold">คู่มือนี้เขียนอย่างไร</h2>
              <p className="m-0 leading-8 text-muted-foreground">
                ทุกบทร่างด้วย AI แล้วผู้สอนตรวจ แก้ และรับรองก่อนเผยแพร่ ทุกบทระบุวันที่อัปเดต ถ้าเจอจุดที่ผิดหรือล้าสมัย{' '}
                <Link href="/contact" className="font-medium text-link underline underline-offset-4">แจ้งเราได้</Link>
              </p>
              <p className="m-0 leading-8 text-muted-foreground">วิธีเขียนแบบนี้คือสิ่งเดียวกับที่คู่มือสอน: ให้ AI ช่วยทำ แล้วคนตรวจและรับผิดชอบ</p>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl bg-[var(--color-accent-soft)] p-6">
              <h2 className="m-0 text-h3 font-semibold">อยากลงมือทำจริงพร้อมผู้สอน</h2>
              <p className="m-0 leading-8">คู่มือให้พื้นฐานฟรีทั้งหมด ถ้าอยากฝึกกับโปรเจคจริงและมีคนช่วยดูงาน ดูคอร์สของเราได้</p>
              <Button asChild variant="outline" className="self-start">
                <Link href="/courses">ดูคอร์สทั้งหมด</Link>
              </Button>
            </div>
          </div>
        </section>
      </MainContent>
      <Footer />
    </>
  );
}

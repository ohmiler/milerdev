import MainContent from '@/components/layout/MainContent';
import Link from 'next/link';
import FAQAccordion from '@/components/faq/FAQAccordion';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import SectionHeader from '@/components/layout/SectionHeader';
import { FAQ_CATEGORIES } from './faq-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { buildFaqPageJsonLd, serializeJsonLd } from '@/lib/content/seo';

const questionCount = FAQ_CATEGORIES.reduce((total, category) => total + category.items.length, 0);
const faqJsonLd = buildFaqPageJsonLd(FAQ_CATEGORIES.flatMap((category) => category.items));

export default function FAQPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
      />
      <Navbar />
      <MainContent className="bg-[var(--academy-canvas)]">
        <header className="border-b bg-[radial-gradient(circle_at_15%_10%,var(--color-accent-soft),transparent_34%),var(--academy-canvas)] py-16 sm:py-20 lg:py-24">
          <div className="container grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-end lg:gap-16">
            <div>
              <h1 className="text-h1 font-semibold">คำตอบที่ช่วยให้ไปต่อได้</h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">รวมข้อมูลเรื่องการเริ่มเรียน คอร์ส การชำระเงิน และบัญชี เพื่อให้คุณตัดสินใจหรือแก้ปัญหาได้จากจุดเดียว</p>
            </div>
            <Card><CardContent className="pt-6"><dl className="grid grid-cols-3 gap-3 text-center"><div><dt className="text-caption text-muted-foreground">คำถาม</dt><dd className="mt-2 text-2xl font-semibold">{questionCount}</dd></div><div><dt className="text-caption text-muted-foreground">หมวด</dt><dd className="mt-2 text-2xl font-semibold">{FAQ_CATEGORIES.length}</dd></div><div><dt className="text-caption text-muted-foreground">ทางเลือกถัดไป</dt><dd className="mt-2"><Button size="sm" variant="outline" asChild><Link href="/contact">ติดต่อทีม</Link></Button></dd></div></dl></CardContent></Card>
          </div>
        </header>

        <section className="py-14 sm:py-20" aria-labelledby="faq-index-title">
          <div className="container grid gap-10 lg:grid-cols-[16rem_1fr] lg:items-start lg:gap-14">
            <aside className="top-24 lg:sticky">
              <h2 id="faq-index-title" className="text-h3 font-semibold">เลือกหัวข้อ</h2>
              <nav className="mt-5 flex flex-col gap-1" aria-label="หมวดคำถาม">
                {FAQ_CATEGORIES.map((category, index) => (
                  <a className="block rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" href={`#faq-category-${index + 1}`} key={category.title}>
                    {category.title}
                  </a>
                ))}
              </nav>
            </aside>

            <div className="flex flex-col gap-12">
              {FAQ_CATEGORIES.map((category, index) => (
                <section id={`faq-category-${index + 1}`} className="scroll-mt-24" aria-labelledby={`faq-category-title-${index + 1}`} key={category.title}>
                  <SectionHeader
                    id={`faq-category-title-${index + 1}`}
                    eyebrow={`${category.items.length} คำถาม`}
                    title={category.title}
                    className="mb-5"
                  />
                  <FAQAccordion categoryIndex={index} items={category.items} />
                </section>
              ))}

              <Card className="bg-[var(--academy-navy)] text-white" aria-labelledby="faq-contact-title"><CardContent className="pt-6"><h2 id="faq-contact-title" className="text-h3 font-semibold">ยังไม่เจอคำตอบที่ตรงกับเรื่องของคุณ</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">ส่งรายละเอียดให้ทีม MilerDev พร้อมข้อมูลที่จำเป็น เราจะตอบกลับผ่านอีเมลที่คุณระบุ</p><Button className="mt-6" asChild><Link href="/contact">ติดต่อทีม MilerDev →</Link></Button></CardContent></Card>
            </div>
          </div>
        </section>
      </MainContent>
      <Footer />
    </>
  );
}

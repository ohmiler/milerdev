import MainContent from '@/components/layout/MainContent';
import Link from 'next/link';
import FAQAccordion from '@/components/faq/FAQAccordion';
import FAQSearch from '@/components/faq/FAQSearch';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import SectionHeader from '@/components/layout/SectionHeader';
import { FAQ_CATEGORIES } from './faq-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { buildFaqPageJsonLd, serializeJsonLd } from '@/lib/content/seo';

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
        {/* Short, so a phone shows the search and the first question on its first screen. */}
        <header className="border-b bg-[radial-gradient(circle_at_15%_10%,var(--color-accent-soft),transparent_34%),var(--academy-canvas)] py-8 sm:py-14">
          <div className="container">
            <h1 className="text-h1 font-semibold">คำตอบที่ช่วยให้ไปต่อได้</h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">เรื่องการเริ่มเรียน คอร์ส การชำระเงิน และบัญชี ถ้ายังไม่เจอคำตอบ <Link className="font-medium text-link hover:underline" href="/contact">ถามทีมได้เลย</Link></p>
          </div>
        </header>

        <section className="py-8 sm:py-14" aria-label="คำถามที่พบบ่อย">
          <FAQSearch
            categories={FAQ_CATEGORIES}
            nav={(
              <nav className="flex flex-col gap-1" aria-label="หมวดคำถาม">
                {FAQ_CATEGORIES.map((category, index) => (
                  <a className="block rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" href={`#faq-category-${index + 1}`} key={category.title}>
                    {category.title}
                  </a>
                ))}
              </nav>
            )}
            footer={(
              <Card className="bg-[var(--academy-navy)] text-white" aria-labelledby="faq-contact-title"><CardContent className="pt-6"><h2 id="faq-contact-title" className="text-h3 font-semibold">ยังไม่เจอคำตอบที่ตรงกับเรื่องของคุณ</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">ส่งรายละเอียดให้ทีม MilerDev พร้อมข้อมูลที่จำเป็น เราจะตอบกลับผ่านอีเมลที่คุณระบุ</p><Button className="mt-6" asChild><Link href="/contact">ติดต่อทีม MilerDev →</Link></Button></CardContent></Card>
            )}
          >
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
          </FAQSearch>
        </section>
      </MainContent>
      <Footer />
    </>
  );
}

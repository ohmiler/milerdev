import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import PublicPageHeader from '@/components/layout/PublicPageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'เกี่ยวกับเรา',
  description: 'รู้จัก MilerDev coding learning studio ภาษาไทยที่เน้นการเรียนผ่านการลงมือสร้างโปรเจกต์จริง',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'เกี่ยวกับ MilerDev',
    description: 'coding learning studio ภาษาไทยที่ช่วยให้ผู้เรียนเข้าใจโค้ดผ่านการลงมือสร้าง',
    url: '/about',
    siteName: 'MilerDev',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'เกี่ยวกับเรา - MilerDev',
    description: 'coding learning studio ภาษาไทยที่ช่วยให้ผู้เรียนเข้าใจโค้ดผ่านการลงมือสร้าง',
  },
};

const learningMethod = [
  { title: 'เข้าใจเหตุผล', description: 'เริ่มจากปัญหาและเป้าหมายของงาน เพื่อให้รู้ว่าเครื่องมือแต่ละชิ้นมีไว้ทำอะไร' },
  { title: 'เขียนไปพร้อมกัน', description: 'เรียนแนวคิดผ่านโค้ด ตัวอย่าง และการลงมือทำ ไม่หยุดอยู่ที่การจำ syntax' },
  { title: 'จบด้วยผลงาน', description: 'เชื่อมบทเรียนเป็นโปรเจกต์ที่อธิบายได้ ทดสอบได้ และนำไปพัฒนาต่อได้' },
];

const principles = [
  ['สอนจากงานจริง', 'เลือกเนื้อหาที่เชื่อมกับการสร้างเว็บไซต์และ software ที่ใช้งานได้'],
  ['อธิบายให้เห็นภาพ', 'ทำให้ technical concept เข้าใจได้โดยไม่ลดทอนสาระสำคัญ'],
  ['วางเส้นทางให้ชัด', 'ผู้เรียนควรรู้ว่ากำลังเรียนอะไร เรียนไปเพื่ออะไร และควรทำอะไรต่อ'],
  ['เรียนต่อได้ไม่เสียจังหวะ', 'บทเรียน progress และ next action ต้องช่วยให้กลับมาทำต่อได้ทันที'],
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="bg-[var(--academy-canvas)]">
        <PublicPageHeader
          variant="story"
          title="พื้นที่เรียนโค้ดสำหรับคนที่อยากสร้างจริง"
          description="MilerDev คือ coding learning studio ภาษาไทย เราออกแบบคอร์สและบทเรียนให้ผู้เรียนเข้าใจแนวคิดผ่านการเขียนโค้ดและสร้างโปรเจกต์ด้วยตัวเอง"
        />

        <section className="py-14 sm:py-20" aria-labelledby="about-manifesto-title">
          <div className="container grid gap-8 lg:grid-cols-[.7fr_1.3fr] lg:items-center lg:gap-16">
            <div className="relative mx-auto flex aspect-square w-full max-w-sm items-center justify-center overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_50%_35%,rgba(0,171,255,.3),transparent_40%),var(--academy-navy)] p-8 shadow-[var(--academy-shadow-card)]" aria-hidden="true">
              <Image src={'/milerdev-logo-transparent.png'} alt={''} width={280} height={280} priority />
            </div>
            <div>
              <h2 id="about-manifesto-title" className="text-3xl leading-tight font-semibold tracking-[-.03em] text-balance sm:text-4xl">การเรียนเขียนโปรแกรมควรพาคุณไปไกลกว่าการทำตาม</h2>
              <div className="mt-6 max-w-2xl space-y-4 text-base leading-8 text-muted-foreground"><p>เป้าหมายของเราไม่ใช่การรวบรวมวิดีโอให้ได้มากที่สุด แต่คือการจัดลำดับความรู้ให้ผู้เรียนเห็นความสัมพันธ์ระหว่างแนวคิด โค้ด และผลลัพธ์ที่เกิดขึ้นจริง</p><p>เมื่อจบบทเรียน ผู้เรียนควรอธิบายสิ่งที่ตัวเองสร้างได้ แก้ปัญหาต่อได้ และรู้ว่าควรพัฒนาทักษะส่วนไหนเป็นลำดับถัดไป</p></div>
            </div>
          </div>
        </section>

        <section className="border-y bg-background py-14 sm:py-20" aria-labelledby="about-method-title">
          <div className={'container'}>
            <div className="mb-8 grid gap-3 md:grid-cols-[1fr_.8fr] md:items-end">
              <h2 id="about-method-title" className="text-3xl font-semibold tracking-[-.03em] sm:text-4xl">วิธีเรียนแบบ MilerDev</h2>
              <p className="leading-7 text-muted-foreground">ทุกคอร์สเดินจากความเข้าใจ ไปสู่การลงมือเขียน และจบด้วยสิ่งที่ตรวจสอบได้</p>
            </div>
            <ol className="grid gap-5 md:grid-cols-3">
              {learningMethod.map((item) => (
                <li key={item.title}><Card className="h-full"><CardHeader><CardTitle className="text-xl">{item.title}</CardTitle></CardHeader><CardContent><p className="text-sm leading-7 text-muted-foreground">{item.description}</p></CardContent></Card></li>
              ))}
            </ol>
          </div>
        </section>

        <section className="py-14 sm:py-20" aria-labelledby="about-principles-title">
          <div className="container grid gap-8 lg:grid-cols-[.7fr_1.3fr] lg:gap-16">
            <div>
              <h2 id="about-principles-title" className="text-3xl font-semibold tracking-[-.03em] sm:text-4xl">หลักที่ใช้ตัดสินใจทุกบทเรียน</h2>
            </div>
            <dl className="divide-y border-y">
              {principles.map(([title, description]) => (
                <div key={title} className="grid gap-2 py-5 sm:grid-cols-[12rem_1fr] sm:gap-8">
                  <dt className="font-semibold">{title}</dt>
                  <dd className="text-sm leading-7 text-muted-foreground">{description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="bg-[var(--academy-navy)] py-14 text-white sm:py-20" aria-labelledby="about-proof-title">
          <div className={'container'}>
            <div className="mb-8 grid gap-3 md:grid-cols-[1fr_.8fr] md:items-end">
              <h2 id="about-proof-title" className="text-3xl font-semibold tracking-[-.03em] sm:text-4xl">จากห้องเรียนสู่เวทีแบ่งปันความรู้</h2>
              <p className="leading-7 text-white/65">MilerDev เคยได้รับเชิญจากองค์กรและมหาวิทยาลัยให้เป็นวิทยากรด้านการเขียนโปรแกรมและการพัฒนาเว็บไซต์</p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {[1, 5, 9].map((number) => (
                <figure key={number} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  <Image className="aspect-[4/3] w-full object-cover" src={`/showcase/${String(number).padStart(2, '0')}-showcase-1024x768.webp`} alt={`บรรยากาศงานบรรยายของ MilerDev ภาพที่ ${number}`} width={1024} height={768} sizes={'(max-width: 640px) 100vw, 33vw'} />
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-20">
          <div className="container grid gap-6 rounded-3xl border bg-card p-8 shadow-[var(--academy-shadow-card)] md:grid-cols-[1fr_auto] md:items-end sm:p-10">
            <div><h2 className="text-3xl leading-tight font-semibold tracking-[-.03em]">เลือกทักษะที่อยากพัฒนา แล้วเริ่มสร้างโปรเจกต์แรก</h2><p className="mt-3 leading-7 text-muted-foreground">ดูรายละเอียด ผลลัพธ์ และเนื้อหาของแต่ละคอร์สก่อนตัดสินใจเรียน</p></div>
            <div className="flex flex-wrap gap-3">
              <Button asChild><Link href="/courses">ดูคอร์สทั้งหมด →</Link></Button>
              <Button variant="outline" asChild><Link href="/contact">ติดต่อ MilerDev</Link></Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

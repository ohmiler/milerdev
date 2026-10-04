import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/layout/Footer';
import MainContent from '@/components/layout/MainContent';
import Navbar from '@/components/layout/Navbar';
import StackExplorer from '@/components/stack/StackExplorer';
import { Button } from '@/components/ui/button';
import { findStackNode, STACK_JOURNEYS, STACK_LAYERS, STACK_NODES } from '@/lib/content/stack';

const description = 'MilerDev สร้างด้วยอะไร และแต่ละส่วนคุยกันยังไง ตั้งแต่ Next.js ฐานข้อมูล ระบบชำระเงิน วิดีโอ จนถึงการส่งโค้ดขึ้นเว็บจริง';
// A capture of the 3D model itself, so a shared link shows what the page is.
const ogImage = { url: '/og-stack.png', width: 1200, height: 630, alt: 'โมเดล 3 มิติของชั้นต่างๆ ที่ใช้สร้าง MilerDev' };

export const metadata: Metadata = {
  title: 'เบื้องหลัง MilerDev',
  description,
  alternates: { canonical: '/stack' },
  openGraph: {
    title: 'เบื้องหลัง MilerDev: Stack ที่ใช้สร้างเว็บนี้',
    description,
    url: '/stack',
    siteName: 'MilerDev',
    images: [ogImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'เบื้องหลัง MilerDev',
    description,
    images: [ogImage.url],
  },
};

export default function StackPage() {
  return (
    <>
      <Navbar />
      <MainContent className={'bg-[var(--academy-canvas)]'}>
        <StackExplorer />

        <section className={'py-14 sm:py-20'} aria-labelledby={'stack-parts-title'}>
          <div className={'container'}>
            <h2 id={'stack-parts-title'} className={'scroll-mt-24 text-3xl font-semibold tracking-[-.03em] sm:text-4xl'}>ทุกส่วนในระบบ</h2>
            <div className={'mt-8 flex flex-col gap-10'}>
              {STACK_LAYERS.map((layer) => (
                <div key={layer.id} className={'grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10'}>
                  <div>
                    <h3 className={'text-xl font-semibold'}>ชั้น{layer.name}</h3>
                    <p className={'mt-1 text-sm leading-6 text-muted-foreground'}>{layer.summary}</p>
                  </div>
                  <dl className={'divide-y border-y'}>
                    {STACK_NODES.filter((node) => node.layer === layer.id).map((node) => (
                      <div key={node.id} className={'grid gap-1 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-8'}>
                        <dt>
                          <span className={'block font-semibold'}>{node.name}</span>
                          <span className={'block text-sm text-muted-foreground'}>{node.tag}</span>
                        </dt>
                        <dd className={'text-sm leading-7 text-muted-foreground'}>
                          <p>{node.does}</p>
                          <p>{node.why}</p>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={'border-t bg-background py-14 sm:py-20'} aria-labelledby={'stack-flows-title'}>
          <div className={'container'}>
            <h2 id={'stack-flows-title'} className={'text-3xl font-semibold tracking-[-.03em] sm:text-4xl'}>ข้อมูลวิ่งยังไง</h2>
            <div className={'mt-8 grid gap-6 md:grid-cols-2'}>
              {STACK_JOURNEYS.map((journey) => (
                <div key={journey.id} className={'rounded-2xl border bg-card p-6'}>
                  <h3 className={'text-lg font-semibold'}>{journey.name}</h3>
                  <p className={'mt-1 text-sm text-muted-foreground'}>{journey.summary}</p>
                  <ol className={'mt-4 flex list-decimal flex-col gap-2 pl-5 text-sm leading-6'}>
                    {journey.steps.map((step, index) => (
                      <li key={`${step.from}-${step.to}-${index}`}>
                        <span className={'font-medium'}>{findStackNode(step.from)?.name} → {findStackNode(step.to)?.name}:</span>{' '}
                        <span className={'text-muted-foreground'}>{step.caption}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={'py-14 sm:py-20'}>
          <div className={'container grid gap-6 rounded-3xl border bg-card p-8 shadow-[var(--academy-shadow-card)] sm:p-10 md:grid-cols-[1fr_auto] md:items-end'}>
            <div>
              <h2 className={'text-3xl leading-tight font-semibold tracking-[-.03em]'}>อยากสร้างเว็บแบบนี้ได้เอง</h2>
              <p className={'mt-3 leading-7 text-muted-foreground'}>เริ่มจากพื้นฐานที่ใช้จริงในเว็บนี้ แล้วค่อยต่อยอดทีละส่วน</p>
            </div>
            <div className={'flex flex-wrap gap-3'}>
              <Button asChild><Link href={'/courses'}>ดูคอร์สทั้งหมด →</Link></Button>
            </div>
          </div>
        </section>
      </MainContent>
      <Footer />
    </>
  );
}

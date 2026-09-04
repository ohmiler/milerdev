import MainContent from '@/components/layout/MainContent';
import Link from 'next/link';
import ContactForm from '@/components/contact/ContactForm';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import PublicPageHeader from '@/components/layout/PublicPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <MainContent className="bg-[var(--academy-canvas)]">
        <PublicPageHeader
          variant="task"
          title="บอกเราได้ว่าคุณกำลังติดเรื่องไหน"
          description="สอบถามเรื่องคอร์ส การเรียน การชำระเงิน หรือเสนอความร่วมมือ ส่งรายละเอียดมาให้ครบเพื่อให้ทีมตอบกลับได้ตรงประเด็น"
        />

        <section className="py-14 sm:py-20" aria-labelledby="contact-form-title">
          <div className="container grid gap-6 lg:grid-cols-[.7fr_1.3fr] lg:gap-8">
            <Card className="h-fit bg-[var(--academy-navy)] text-white shadow-[var(--academy-shadow-card)]" aria-label="ข้อมูลการติดต่อ">
              <CardHeader><CardTitle className="text-2xl text-white">ช่องทางติดต่อ</CardTitle></CardHeader>
              <CardContent><dl className="divide-y divide-white/10 border-y border-white/10">{[
                ['อีเมล', <a key="email" className="text-primary hover:underline" href="mailto:milerdev.official@gmail.com">milerdev.official@gmail.com</a>],
                ['เวลาทำการ', <>จันทร์ถึงศุกร์<br />09:00 ถึง 18:00 น.</>],
                ['เรื่องที่ติดต่อได้', <>คอร์สและการเรียน<br />การชำระเงิน<br />งานวิทยากรและความร่วมมือ</>],
              ].map(([label, value]) => <div key={String(label)} className="grid gap-2 py-5 sm:grid-cols-[7rem_1fr]"><dt className="text-sm font-semibold text-white">{label}</dt><dd className="text-sm leading-6 text-white/65">{value}</dd></div>)}</dl><p className="mt-6 rounded-xl bg-white/5 p-4 text-xs leading-6 text-white/60">หลีกเลี่ยงการส่งรหัสผ่าน ข้อมูลบัตร หรือข้อมูลส่วนตัวที่ไม่จำเป็นผ่านแบบฟอร์มนี้</p></CardContent>
            </Card>

            <Card className="shadow-[var(--academy-shadow-card)]">
              <CardHeader><CardTitle id="contact-form-title" className="text-2xl sm:text-3xl">ส่งรายละเอียดให้ทีม MilerDev</CardTitle><p className="text-sm leading-6 text-muted-foreground">กรอกข้อมูลที่จำเป็น ทีมจะใช้ข้อมูลนี้เพื่อตอบกลับคำถามของคุณเท่านั้น</p></CardHeader>
              <CardContent className={'flex flex-col gap-5'}>
                <Button asChild variant={'link'} className={'h-auto w-fit justify-start px-0 py-0'}>
                  <Link href={'/faq'}>ลองดูคำถามที่พบบ่อยก่อน</Link>
                </Button>
                <ContactForm />
              </CardContent>
            </Card>
          </div>
        </section>
      </MainContent>
      <Footer />
    </>
  );
}

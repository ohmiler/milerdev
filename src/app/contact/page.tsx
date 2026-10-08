import MainContent from '@/components/layout/MainContent';
import Link from 'next/link';
import ContactForm from '@/components/contact/ContactForm';
import { FacebookIcon } from '@/components/content/SocialIcons';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import PublicPageHeader from '@/components/layout/PublicPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CONTACT_EMAIL, CONTACT_RESPONSE_TIME, FACEBOOK_PAGE_URL } from '@/lib/content/contact';

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <MainContent className="bg-[var(--academy-canvas)]">
        <PublicPageHeader
          variant="task"
          title="ติดต่อทีม MilerDev"
          description={`ถามเรื่องคอร์ส การชำระเงิน หรือเสนองานร่วมกันได้ ทีมตอบกลับ${CONTACT_RESPONSE_TIME}`}
        />

        {/* The form comes first, so on a phone it starts on the first screen; the other channels follow. */}
        <section className="py-8 sm:py-14" aria-labelledby="contact-form-title">
          <div className="container grid gap-6 lg:grid-cols-[1.3fr_.7fr] lg:gap-8">
            <Card className="shadow-[var(--academy-shadow-card)]">
              <CardHeader><CardTitle id="contact-form-title" className="text-2xl sm:text-3xl">ส่งข้อความถึงทีม</CardTitle><p className="text-sm leading-6 text-muted-foreground">ทีมจะใช้ข้อมูลนี้เพื่อตอบกลับคำถามของคุณเท่านั้น</p></CardHeader>
              <CardContent className={'flex flex-col gap-5'}>
                <Button asChild variant={'link'} className={'h-auto w-fit justify-start px-0 py-0'}>
                  <Link href={'/faq'}>ลองดูคำถามที่พบบ่อยก่อน</Link>
                </Button>
                <ContactForm />
              </CardContent>
            </Card>

            <Card className="h-fit bg-[var(--academy-navy)] text-white shadow-[var(--academy-shadow-card)]" aria-label="ช่องทางติดต่ออื่น">
              <CardHeader><CardTitle className="text-2xl text-white">ช่องทางอื่น</CardTitle></CardHeader>
              <CardContent><dl className="divide-y divide-white/10 border-y border-white/10">{[
                ['อีเมล', <a key="email" className="text-link-inverse hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>],
                ['เพจ Facebook', <a key="facebook" className="inline-flex items-center gap-2 text-link-inverse hover:underline" href={FACEBOOK_PAGE_URL} target="_blank" rel="noopener noreferrer"><FacebookIcon />ทักแชทเพจ MilerDev</a>],
                ['เวลาทำการ', <>จันทร์ถึงศุกร์<br />09:00 ถึง 18:00 น.</>],
                ['ตอบกลับ', CONTACT_RESPONSE_TIME],
              ].map(([label, value]) => <div key={String(label)} className="grid gap-2 py-5 sm:grid-cols-[7rem_1fr]"><dt className="text-sm font-semibold text-white">{label}</dt><dd className="text-sm leading-6 text-white/65">{value}</dd></div>)}</dl><p className="mt-6 rounded-xl bg-white/5 p-4 text-caption leading-6 text-white/60">หลีกเลี่ยงการส่งรหัสผ่าน ข้อมูลบัตร หรือข้อมูลส่วนตัวที่ไม่จำเป็นผ่านแบบฟอร์มนี้</p></CardContent>
            </Card>
          </div>
        </section>
      </MainContent>
      <Footer />
    </>
  );
}

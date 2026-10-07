import Link from 'next/link';
import { FacebookIcon, YouTubeIcon } from '@/components/content/SocialIcons';
import { Separator } from '@/components/ui/separator';

const quickLinks = [
  { href: '/courses', label: 'คอร์สทั้งหมด' },
  { href: '/about', label: 'เกี่ยวกับเรา' },
  { href: '/stack', label: 'เบื้องหลัง MilerDev' },
  { href: '/contact', label: 'ติดต่อ' },
];

const supportLinks = [
  { href: '/faq', label: 'คำถามที่พบบ่อย' },
  { href: '/terms', label: 'เงื่อนไขการใช้งาน' },
  { href: '/privacy', label: 'นโยบายความเป็นส่วนตัว' },
];

const linkClass = 'text-sm leading-6 text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30';

export default function Footer() {
  return (
    <footer className="border-t bg-[var(--academy-canvas)]">
      <div className="container py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(10rem,.6fr))] lg:gap-12">
          <div className="max-w-xl">
            <Link href="/" className="inline-flex items-center gap-3 rounded-lg font-heading text-xl font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30" aria-label="MilerDev หน้าแรก">
              <img src="/milerdev-logo-transparent.png" alt="" width={48} height={48} />
              <span>MilerDev</span>
            </Link>
            <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">พื้นที่เรียนออนไลน์สำหรับพัฒนาทักษะการเขียนโปรแกรม จากความเข้าใจพื้นฐานไปสู่โปรเจกต์ที่นำไปต่อยอดได้จริง</p>
            <div className="mt-6 flex flex-wrap gap-3" aria-label="ช่องทางติดตาม MilerDev">
              <a href="https://www.facebook.com/milerdevpro" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border bg-background px-3 text-sm font-medium hover:bg-muted"><FacebookIcon />Facebook</a>
              <a href="https://www.youtube.com/channel/UCeKE6wQHTt5JpS9_RsH4hrg" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border bg-background px-3 text-sm font-medium hover:bg-muted"><YouTubeIcon />YouTube</a>
              <a href="https://discord.gg/9Y5ZckGD2B" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-xl border bg-background px-3 text-sm font-medium hover:bg-muted">Discord</a>
            </div>
          </div>

          <nav aria-labelledby="footer-explore">
            <h2 id="footer-explore" className="mb-4 text-sm font-semibold">สำรวจ MilerDev</h2>
            <ul className="flex flex-col gap-3">{quickLinks.map((link) => <li key={link.href}><Link className={linkClass} href={link.href}>{link.label}</Link></li>)}</ul>
          </nav>

          <nav aria-labelledby="footer-support">
            <h2 id="footer-support" className="mb-4 text-sm font-semibold">ข้อมูลและความช่วยเหลือ</h2>
            <ul className="flex flex-col gap-3">{supportLinks.map((link) => <li key={link.href}><Link className={linkClass} href={link.href}>{link.label}</Link></li>)}</ul>
          </nav>

          <div>
            <h2 className="mb-4 text-sm font-semibold">คุยกับเรา</h2>
            <div className="flex flex-col gap-3 text-sm leading-6 text-muted-foreground">
              <a className={linkClass} href="mailto:milerdev.official@gmail.com">milerdev.official@gmail.com</a>
              <address className="not-italic">กรุงเทพมหานคร, ประเทศไทย</address>
              <p>จันทร์–ศุกร์<br />09:00–18:00 น.</p>
            </div>
          </div>
        </div>
        <Separator className="my-10" />
        <div className="flex flex-col gap-2 text-caption text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 MilerDev. สงวนลิขสิทธิ์ทั้งหมด</p>
          <p>เรียนให้เข้าใจ แล้วสร้างในแบบของคุณ</p>
        </div>
      </div>
    </footer>
  );
}

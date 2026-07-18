import Link from 'next/link';
import styles from './Footer.module.css';

const quickLinks = [
  { href: '/courses', label: 'คอร์สทั้งหมด' },
  { href: '/about', label: 'เกี่ยวกับเรา' },
  { href: '/contact', label: 'ติดต่อ' },
];

const supportLinks = [
  { href: '/faq', label: 'คำถามที่พบบ่อย' },
  { href: '/terms', label: 'เงื่อนไขการใช้งาน' },
  { href: '/privacy', label: 'นโยบายความเป็นส่วนตัว' },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.main}>
          <div>
            <Link href="/" className={styles.brandLink} aria-label="MilerDev หน้าแรก">
              <img src="/milerdev-logo-transparent.png" alt="" width={54} height={54} />
              <span>MilerDev</span>
            </Link>
            <p className={styles.brandCopy}>
              พื้นที่เรียนออนไลน์สำหรับพัฒนาทักษะการเขียนโปรแกรม
              จากความเข้าใจพื้นฐานไปสู่โปรเจกต์ที่คุณนำไปต่อยอดได้จริง
            </p>

            <div className={styles.socials} aria-label="ช่องทางติดตาม MilerDev">
              <a
                href="https://www.facebook.com/milerdevpro"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.social}
                aria-label="ติดตาม MilerDev บน Facebook"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </a>
              <a
                href="https://www.youtube.com/channel/UCeKE6wQHTt5JpS9_RsH4hrg"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.social}
                aria-label="ติดตาม MilerDev บน YouTube"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814C22.996 7.137 22.243 6.384 21.376 6.05zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                YouTube
              </a>
            </div>
          </div>

          <div className={styles.directory}>
            <nav className={styles.column} aria-labelledby="footer-explore">
              <h2 id="footer-explore">สำรวจ MilerDev</h2>
              <ul>
                {quickLinks.map((link) => (
                  <li key={link.href}><Link href={link.href}>{link.label}</Link></li>
                ))}
              </ul>
            </nav>

            <nav className={styles.column} aria-labelledby="footer-support">
              <h2 id="footer-support">ข้อมูลและความช่วยเหลือ</h2>
              <ul>
                {supportLinks.map((link) => (
                  <li key={link.href}><Link href={link.href}>{link.label}</Link></li>
                ))}
              </ul>
            </nav>

            <div className={styles.contact}>
              <h2>คุยกับเรา</h2>
              <div className={styles.contactBody}>
                <a href="mailto:milerdev.official@gmail.com">milerdev.official@gmail.com</a>
                <address>กรุงเทพมหานคร, ประเทศไทย</address>
                <p>จันทร์–ศุกร์ / 09:00–18:00 น.</p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <p>© 2026 MilerDev. สงวนลิขสิทธิ์ทั้งหมด</p>
          <p className={styles.signature}>เรียนให้เข้าใจ แล้วสร้างในแบบของคุณ</p>
        </div>
      </div>
    </footer>
  );
}

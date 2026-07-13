import Link from 'next/link';

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
        <footer className="site-footer" data-theme="dark" data-surface="public-footer">
            <div className="container site-footer__inner">
                <div className="site-footer__meta" aria-hidden="true">
                    <span>SITE DIRECTORY / MILERDEV</span>
                    <span>BANGKOK / THAILAND</span>
                </div>

                <div className="site-footer__grid">
                    <div className="site-footer__brand">
                        <Link href="/" className="site-footer__brand-link" aria-label="MilerDev หน้าแรก">
                            <img
                                src="/milerdev-logo-transparent.png"
                                alt=""
                                width={52}
                                height={52}
                            />
                            <span>MilerDev</span>
                        </Link>
                        <p>
                            แพลตฟอร์มเรียนออนไลน์สำหรับพัฒนาทักษะการเขียนโปรแกรม
                            และสร้างผลงานเพื่อก้าวสู่อาชีพนักพัฒนา
                        </p>
                        <div className="site-footer__socials" aria-label="ช่องทางติดตาม MilerDev">
                            <a
                                href="https://www.facebook.com/milerdevpro"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="site-footer__social"
                                aria-label="ติดตาม MilerDev บน Facebook"
                            >
                                <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                                <span>Facebook</span>
                            </a>
                            <a
                                href="https://www.youtube.com/channel/UCeKE6wQHTt5JpS9_RsH4hrg"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="site-footer__social"
                                aria-label="ติดตาม MilerDev บน YouTube"
                            >
                                <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                </svg>
                                <span>YouTube</span>
                            </a>
                        </div>
                    </div>

                    <nav className="site-footer__column site-footer__column--quick" aria-labelledby="footer-quick-links">
                        <h2 id="footer-quick-links"><span aria-hidden="true">01</span>สำรวจ</h2>
                        <ul>
                            {quickLinks.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href}>{link.label}<span aria-hidden="true">→</span></Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <nav className="site-footer__column site-footer__column--support" aria-labelledby="footer-support-links">
                        <h2 id="footer-support-links"><span aria-hidden="true">02</span>ช่วยเหลือ</h2>
                        <ul>
                            {supportLinks.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href}>{link.label}<span aria-hidden="true">→</span></Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <div className="site-footer__column site-footer__contact">
                        <h2><span aria-hidden="true">03</span>ติดต่อเรา</h2>
                        <a href="mailto:milerdev.official@gmail.com">milerdev.official@gmail.com</a>
                        <address>กรุงเทพมหานคร, ประเทศไทย</address>
                        <p>จันทร์–ศุกร์ / 09:00–18:00 น.</p>
                    </div>
                </div>

                <div className="site-footer__bottom">
                    <p>© 2026 MilerDev. สงวนลิขสิทธิ์ทั้งหมด</p>
                    <p aria-hidden="true">LEARN / BUILD / SHIP</p>
                </div>
            </div>

            <style>{`
                .site-footer {
                    --footer-bg: #1e1e1e;
                    --footer-ink: #f4f4f4;
                    --footer-muted: #b8b8b8;
                    --footer-line: #3c3c3c;
                    --footer-accent: #02abff;
                    background: var(--footer-bg);
                    color: var(--footer-ink);
                    border-top: 1px solid var(--footer-line);
                }
                .site-footer__inner {
                    padding-block: clamp(48px, 6vw, 80px) 28px;
                }
                .site-footer__meta {
                    display: flex;
                    justify-content: space-between;
                    gap: 24px;
                    padding-bottom: 16px;
                    color: var(--footer-muted);
                    font-family: var(--font-code);
                    font-size: 0.6875rem;
                    font-weight: 700;
                    letter-spacing: 0.06em;
                }
                .site-footer__meta span:last-child { color: var(--footer-accent); }
                .site-footer__grid {
                    display: grid;
                    grid-template-columns: repeat(12, minmax(0, 1fr));
                    border-top: 1px solid var(--footer-line);
                    border-bottom: 1px solid var(--footer-line);
                }
                .site-footer__brand {
                    grid-column: 1 / span 5;
                    padding: clamp(32px, 4vw, 52px) clamp(28px, 4vw, 56px) clamp(36px, 4vw, 52px) 0;
                }
                .site-footer__brand-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 14px;
                    color: var(--footer-ink);
                    font-size: clamp(1.5rem, 2vw, 2rem);
                    font-weight: 760;
                    letter-spacing: -0.03em;
                    text-decoration: none;
                }
                .site-footer__brand-link img { object-fit: contain; }
                .site-footer__brand > p {
                    max-width: 42ch;
                    margin-top: 28px;
                    color: var(--footer-muted);
                    font-size: 0.9375rem;
                    line-height: 1.8;
                    text-wrap: pretty;
                }
                .site-footer__socials {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    margin-top: 32px;
                }
                .site-footer__social {
                    display: inline-flex;
                    align-items: center;
                    gap: 9px;
                    min-height: 44px;
                    padding: 0 14px;
                    border: 1px solid var(--footer-line);
                    border-radius: 4px;
                    color: var(--footer-muted);
                    font-family: var(--font-code);
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-decoration: none;
                    transition: border-color 160ms ease-out, color 160ms ease-out, background-color 160ms ease-out;
                }
                .site-footer__social svg { width: 17px; height: 17px; }
                .site-footer__social:hover {
                    border-color: var(--footer-accent);
                    background: #252526;
                    color: var(--footer-accent);
                }
                .site-footer__column {
                    padding: clamp(32px, 4vw, 52px) clamp(18px, 2vw, 28px);
                    border-left: 1px solid var(--footer-line);
                }
                .site-footer__column--quick { grid-column: 6 / span 2; }
                .site-footer__column--support { grid-column: 8 / span 2; }
                .site-footer__contact { grid-column: 10 / span 3; padding-right: 0; }
                .site-footer__column h2 {
                    display: flex;
                    align-items: baseline;
                    gap: 10px;
                    margin: 0 0 28px;
                    color: var(--footer-ink);
                    font-size: 0.875rem;
                    font-weight: 700;
                    line-height: 1.4;
                }
                .site-footer__column h2 span {
                    color: var(--footer-accent);
                    font-family: var(--font-code);
                    font-size: 0.625rem;
                    letter-spacing: 0.06em;
                }
                .site-footer__column ul {
                    display: grid;
                    gap: 4px;
                    margin: 0;
                    padding: 0;
                    list-style: none;
                }
                .site-footer__column li a {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    min-height: 44px;
                    color: var(--footer-muted);
                    font-size: 0.875rem;
                    line-height: 1.5;
                    text-decoration: none;
                    transition: color 160ms ease-out;
                }
                .site-footer__column li a span {
                    color: #707070;
                    font-family: var(--font-code);
                    transition: color 160ms ease-out;
                }
                .site-footer__column li a:hover,
                .site-footer__column li a:hover span { color: var(--footer-accent); }
                .site-footer__contact a,
                .site-footer__contact address,
                .site-footer__contact p {
                    display: block;
                    margin: 0 0 18px;
                    color: var(--footer-muted);
                    font-size: 0.875rem;
                    font-style: normal;
                    line-height: 1.7;
                    overflow-wrap: anywhere;
                    text-decoration: none;
                }
                .site-footer__contact a {
                    color: var(--footer-accent);
                    text-decoration: underline;
                    text-decoration-color: rgba(2, 171, 255, 0.45);
                    text-underline-offset: 4px;
                }
                .site-footer__bottom {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 24px;
                    padding-top: 24px;
                    color: #969696;
                    font-size: 0.75rem;
                    line-height: 1.6;
                }
                .site-footer__bottom p:last-child {
                    color: var(--footer-muted);
                    font-family: var(--font-code);
                    font-weight: 700;
                    letter-spacing: 0.05em;
                }
                .site-footer a:focus-visible {
                    outline: none;
                    box-shadow: 0 0 0 3px rgba(2, 171, 255, 0.34);
                }
                @media (max-width: 1023px) {
                    .site-footer__brand { grid-column: 1 / span 6; }
                    .site-footer__column--quick { grid-column: 7 / span 3; }
                    .site-footer__column--support { grid-column: 10 / span 3; }
                    .site-footer__contact {
                        grid-column: 1 / -1;
                        display: grid;
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                        gap: 24px;
                        padding: 28px 0;
                        border-top: 1px solid var(--footer-line);
                        border-left: 0;
                    }
                    .site-footer__contact h2 { grid-column: 1 / -1; margin-bottom: 0; }
                    .site-footer__contact a,
                    .site-footer__contact address,
                    .site-footer__contact p { margin: 0; }
                }
                @media (max-width: 700px) {
                    .site-footer__meta { align-items: flex-start; flex-direction: column; gap: 8px; }
                    .site-footer__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                    .site-footer__brand { grid-column: 1 / -1; padding: 32px 0 36px; }
                    .site-footer__column--quick {
                        grid-column: 1;
                        padding: 28px 16px 28px 0;
                        border-top: 1px solid var(--footer-line);
                        border-left: 0;
                    }
                    .site-footer__column--support {
                        grid-column: 2;
                        padding: 28px 0 28px 16px;
                        border-top: 1px solid var(--footer-line);
                        border-left: 1px solid var(--footer-line);
                    }
                    .site-footer__contact {
                        grid-column: 1 / -1;
                        display: block;
                        padding: 28px 0;
                        border-top: 1px solid var(--footer-line);
                        border-left: 0;
                    }
                    .site-footer__contact h2 { margin-bottom: 24px; }
                    .site-footer__contact a,
                    .site-footer__contact address,
                    .site-footer__contact p { margin-bottom: 14px; }
                    .site-footer__bottom { align-items: flex-start; flex-direction: column; gap: 8px; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .site-footer a { transition: none; }
                }
            `}</style>
        </footer>
    );
}
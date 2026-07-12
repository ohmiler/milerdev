'use client';

import Link from 'next/link';

const footerLinkStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '44px',
    color: 'var(--ink-muted)',
    textDecoration: 'none',
    fontSize: '0.9375rem',
    transition: 'color 0.2s ease',
} as const;

const socialLinkStyle = {
    width: '44px',
    height: '44px',
    background: 'var(--surface-raised)',
    border: '1px solid var(--line-strong)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--ink-muted)',
    transition: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease',
} as const;

export default function Footer() {
    return (
        <footer className="site-footer" data-theme="dark" data-surface="public-footer" style={{
            background: 'var(--canvas)',
            color: 'var(--ink)',
            paddingTop: '72px',
            paddingBottom: '40px',
            borderTop: '1px solid var(--line)',
        }}>
            <div className="container">
                {/* Main Footer Content */}
                <div className="footer-grid">
                    {/* Brand */}
                    <div>
                        <Link href="/" className="footer-brand-link" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '20px',
                            textDecoration: 'none',
                        }}>
                            <img
                                src="/milerdev-logo-transparent.png"
                                alt="MilerDev"
                                style={{ width: 48, height: 48 }}
                            />
                            <span style={{ 
                                fontWeight: 700, 
                                fontSize: '1.5rem',
                                color: 'var(--ink)',
                                letterSpacing: '-0.02em',
                            }}>MilerDev</span>
                        </Link>
                        <p style={{
                            color: 'var(--ink-muted)',
                            maxWidth: '360px',
                            lineHeight: 1.8,
                            fontSize: '0.9375rem',
                        }}>
                            แพลตฟอร์มเรียนออนไลน์ที่จะช่วยให้คุณพัฒนาทักษะการเขียนโปรแกรม
                            และก้าวสู่การเป็นนักพัฒนามืออาชีพ
                        </p>
                        
                        {/* Social Links */}
                        <div style={{ 
                            display: 'flex', 
                            gap: '12px',
                            marginTop: '24px',
                        }}>
                            <a 
                                href="https://www.facebook.com/milerdevpro"
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="footer-social footer-social--facebook"
                                style={socialLinkStyle}
                                aria-label="Facebook"
                            >
                                <svg style={{ width: '20px', height: '20px' }} fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                            </a>
                            <a 
                                href="https://www.youtube.com/channel/UCeKE6wQHTt5JpS9_RsH4hrg" 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="footer-social footer-social--youtube"
                                style={socialLinkStyle}
                                aria-label="YouTube"
                            >
                                <svg style={{ width: '20px', height: '20px' }} fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 style={{
                            fontWeight: 600,
                            marginBottom: '20px',
                            fontSize: '1rem',
                            color: 'var(--ink)',
                            letterSpacing: '0.02em',
                        }}>ลิงก์ด่วน</h3>
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <li>
                                <Link href="/courses" className="footer-link" style={footerLinkStyle}>
                                    คอร์สทั้งหมด
                                </Link>
                            </li>
                            <li>
                                <Link href="/about" className="footer-link" style={footerLinkStyle}>
                                    เกี่ยวกับเรา
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="footer-link" style={footerLinkStyle}>
                                    ติดต่อ
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h3 style={{
                            fontWeight: 600,
                            marginBottom: '20px',
                            fontSize: '1rem',
                            color: 'var(--ink)',
                            letterSpacing: '0.02em',
                        }}>ช่วยเหลือ</h3>
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <li>
                                <Link href="/faq" className="footer-link" style={footerLinkStyle}>
                                    คำถามที่พบบ่อย
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms" className="footer-link" style={footerLinkStyle}>
                                    เงื่อนไขการใช้งาน
                                </Link>
                            </li>
                            <li>
                                <Link href="/privacy" className="footer-link" style={footerLinkStyle}>
                                    นโยบายความเป็นส่วนตัว
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 style={{
                            fontWeight: 600,
                            marginBottom: '20px',
                            fontSize: '1rem',
                            color: 'var(--ink)',
                            letterSpacing: '0.02em',
                        }}>ติดต่อเรา</h3>
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--ink-muted)', fontSize: '0.9375rem' }}>
                                <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                milerdev.official@gmail.com
                            </li>
                            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: 'var(--ink-muted)', fontSize: '0.9375rem' }}>
                                <svg style={{ width: '18px', height: '18px', flexShrink: 0, marginTop: '2px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>กรุงเทพมหานคร, ประเทศไทย</span>
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--ink-muted)', fontSize: '0.9375rem' }}>
                                <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                จ-ศ: 9:00 - 18:00 น.
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div style={{
                    borderTop: '1px solid var(--line)',
                    paddingTop: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px',
                }} className="md:flex-row md:justify-between">
                    <p style={{
                        color: 'var(--ink-subtle)',
                        fontSize: '0.875rem',
                    }}>
                        © 2026 MilerDev. สงวนลิขสิทธิ์ทั้งหมด
                    </p>
                </div>
            </div>
            <style>{`
                .footer-brand-link {
                    border-radius: 10px;
                }
                .footer-brand-link:focus-visible,
                .footer-link:focus-visible,
                .footer-social:focus-visible {
                    outline: none;
                    box-shadow: var(--focus-ring);
                }
                .footer-link:hover,
                .footer-link:focus-visible {
                    color: var(--accent-strong) !important;
                }
                .footer-social:hover {
                    color: #ffffff !important;
                    transform: translateY(-1px);
                }
                .footer-social--facebook:hover {
                    background: #2563eb !important;
                    border-color: #60a5fa !important;
                }
                .footer-social--youtube:hover {
                    background: #dc2626 !important;
                    border-color: #f87171 !important;
                }
                .footer-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 40px;
                    margin-bottom: 60px;
                }
                @media (min-width: 640px) {
                    .footer-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
                @media (min-width: 1024px) {
                    .footer-grid {
                        grid-template-columns: repeat(4, 1fr);
                    }
                }
            `}</style>
        </footer>
    );
}

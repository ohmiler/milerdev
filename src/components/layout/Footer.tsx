'use client';

import Link from 'next/link';

export default function Footer() {
    return (
        <footer style={{
            background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
            color: 'white',
            paddingTop: '80px',
            paddingBottom: '40px',
        }}>
            <div className="container">
                {/* Main Footer Content */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '40px',
                    marginBottom: '60px',
                }} className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                    {/* Brand */}
                    <div>
                        <Link href="/" style={{
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
                                color: 'white',
                                letterSpacing: '-0.02em',
                            }}>MilerDev</span>
                        </Link>
                        <p style={{
                            color: '#94a3b8',
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
                                href="#" 
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    background: '#334155',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#94a3b8',
                                    transition: 'all 0.2s',
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = '#3b82f6';
                                    e.currentTarget.style.color = 'white';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = '#334155';
                                    e.currentTarget.style.color = '#94a3b8';
                                }}
                                aria-label="Facebook"
                            >
                                <svg style={{ width: '20px', height: '20px' }} fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                            </a>
                            <a 
                                href="#" 
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    background: '#334155',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#94a3b8',
                                    transition: 'all 0.2s',
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = '#ef4444';
                                    e.currentTarget.style.color = 'white';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = '#334155';
                                    e.currentTarget.style.color = '#94a3b8';
                                }}
                                aria-label="YouTube"
                            >
                                <svg style={{ width: '20px', height: '20px' }} fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                </svg>
                            </a>
                            <a 
                                href="#" 
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    background: '#334155',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#94a3b8',
                                    transition: 'all 0.2s',
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = '#1e293b';
                                    e.currentTarget.style.color = 'white';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = '#334155';
                                    e.currentTarget.style.color = '#94a3b8';
                                }}
                                aria-label="GitHub"
                            >
                                <svg style={{ width: '20px', height: '20px' }} fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
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
                            color: 'white',
                            letterSpacing: '0.02em',
                        }}>ลิงก์ด่วน</h3>
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <li>
                                <Link href="/courses" style={{
                                    color: '#94a3b8',
                                    textDecoration: 'none',
                                    fontSize: '0.9375rem',
                                    transition: 'color 0.2s',
                                }}
                                onMouseOver={(e) => e.currentTarget.style.color = '#60a5fa'}
                                onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                                >
                                    คอร์สทั้งหมด
                                </Link>
                            </li>
                            <li>
                                <Link href="/about" style={{
                                    color: '#94a3b8',
                                    textDecoration: 'none',
                                    fontSize: '0.9375rem',
                                    transition: 'color 0.2s',
                                }}
                                onMouseOver={(e) => e.currentTarget.style.color = '#60a5fa'}
                                onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                                >
                                    เกี่ยวกับเรา
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" style={{
                                    color: '#94a3b8',
                                    textDecoration: 'none',
                                    fontSize: '0.9375rem',
                                    transition: 'color 0.2s',
                                }}
                                onMouseOver={(e) => e.currentTarget.style.color = '#60a5fa'}
                                onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                                >
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
                            color: 'white',
                            letterSpacing: '0.02em',
                        }}>ช่วยเหลือ</h3>
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <li>
                                <Link href="/faq" style={{
                                    color: '#94a3b8',
                                    textDecoration: 'none',
                                    fontSize: '0.9375rem',
                                    transition: 'color 0.2s',
                                }}
                                onMouseOver={(e) => e.currentTarget.style.color = '#60a5fa'}
                                onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                                >
                                    คำถามที่พบบ่อย
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms" style={{
                                    color: '#94a3b8',
                                    textDecoration: 'none',
                                    fontSize: '0.9375rem',
                                    transition: 'color 0.2s',
                                }}
                                onMouseOver={(e) => e.currentTarget.style.color = '#60a5fa'}
                                onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                                >
                                    เงื่อนไขการใช้งาน
                                </Link>
                            </li>
                            <li>
                                <Link href="/privacy" style={{
                                    color: '#94a3b8',
                                    textDecoration: 'none',
                                    fontSize: '0.9375rem',
                                    transition: 'color 0.2s',
                                }}
                                onMouseOver={(e) => e.currentTarget.style.color = '#60a5fa'}
                                onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                                >
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
                            color: 'white',
                            letterSpacing: '0.02em',
                        }}>ติดต่อเรา</h3>
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8', fontSize: '0.9375rem' }}>
                                <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                contact@milerdev.com
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8', fontSize: '0.9375rem' }}>
                                <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                02-XXX-XXXX
                            </li>
                            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: '#94a3b8', fontSize: '0.9375rem' }}>
                                <svg style={{ width: '18px', height: '18px', flexShrink: 0, marginTop: '2px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>กรุงเทพมหานคร, ประเทศไทย</span>
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8', fontSize: '0.9375rem' }}>
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
                    borderTop: '1px solid #334155',
                    paddingTop: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px',
                }} className="md:flex-row md:justify-between">
                    <p style={{
                        color: '#64748b',
                        fontSize: '0.875rem',
                    }}>
                        © 2026 MilerDev. สงวนลิขสิทธิ์ทั้งหมด
                    </p>
                </div>
            </div>
        </footer>
    );
}

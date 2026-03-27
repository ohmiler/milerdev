'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminAllLinks, adminPrimaryLinks, adminSecondaryLinkGroups } from '@/components/admin/adminNav';

interface AdminHeaderProps {
  userName: string;
}

function NavIcon({ name, size = 16 }: { name: string; size?: number }) {
  const s = { width: size, height: size, flexShrink: 0 };
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'dashboard': return <svg style={s} viewBox="0 0 24 24" {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
    case 'courses': return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/></svg>;
    case 'blog': return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>;
    case 'docs': return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>;
    case 'users': return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
    case 'payments': return <svg style={s} viewBox="0 0 24 24" {...p}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
    case 'enrollments': return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>;
    case 'reports': return <svg style={s} viewBox="0 0 24 24" {...p}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
    case 'media': return <svg style={s} viewBox="0 0 24 24" {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
    case 'tags': return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
    case 'announcements': return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
    case 'bundles': return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
    case 'coupons': return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M2 9a3 3 0 003 3v0a3 3 0 003-3V5H2v4z"/><path d="M22 9a3 3 0 01-3 3v0a3 3 0 01-3-3V5h6v4z"/><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="6" y2="10"/><line x1="18" y1="10" x2="22" y2="10"/><line x1="12" y1="5" x2="12" y2="19"/></svg>;
    case 'certificates': return <svg style={s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>;
    case 'analytics': return <svg style={s} viewBox="0 0 24 24" {...p}><line x1="4" y1="19" x2="20" y2="19"/><rect x="5" y="10" width="3" height="7" rx="1"/><rect x="10" y="7" width="3" height="10" rx="1"/><rect x="15" y="4" width="3" height="13" rx="1"/></svg>;
    case 'reviews': return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
    case 'reconciliation': return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>;
    case 'logs': return <svg style={s} viewBox="0 0 24 24" {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
    case 'settings': return <svg style={s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
    default: return null;
  }
}

export default function AdminHeader({ userName }: AdminHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const exactMatch = adminAllLinks.find((link) => pathname === link.href);
  const activeTitle = exactMatch?.label || adminAllLinks.find((link) => isActive(link.href, link.exact))?.label || 'Admin';

  return (
    <>
      <header
        className="admin-mobile-header"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'rgba(8, 17, 33, 0.84)',
          backdropFilter: 'blur(18px)',
          borderBottom: '1px solid rgba(148,163,184,0.18)',
        }}
      >
        <div className="admin-mobile-header-shell" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '72px', gap: '12px' }}>
          <Link href="/admin" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div className="admin-mobile-logo-shell">
              <img
                src="/milerdev-logo-transparent.png"
                alt="MilerDev"
                style={{ width: 32, height: 32, flexShrink: 0 }}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>MilerDev Admin</div>
              <div style={{ color: '#93c5fd', fontSize: '0.68rem', marginTop: '4px' }}>{activeTitle}</div>
            </div>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div className="admin-mobile-user-chip">{userName.slice(0, 1).toUpperCase()}</div>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation"
              className="admin-mobile-menu-button"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                border: '1px solid rgba(148,163,184,0.22)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={() => setMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(3,7,18,0.64)', border: 'none', padding: 0, zIndex: 49, cursor: 'pointer' }}
          />
          <nav
            className="admin-mobile-drawer"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: 'min(88vw, 336px)',
              background: 'linear-gradient(180deg, #081121 0%, #0f1b33 54%, #0b1220 100%)',
              borderRight: '1px solid rgba(148,163,184,0.16)',
              zIndex: 50,
              display: 'grid',
              gridTemplateRows: 'auto 1fr auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid rgba(148,163,184,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', position: 'relative' }}>
              <div className="admin-mobile-drawer-orb" aria-hidden="true" />
              <Link href="/admin" onClick={() => setMenuOpen(false)} style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, position: 'relative', zIndex: 1 }}>
                <div className="admin-mobile-logo-shell">
                  <img
                    src="/milerdev-logo-transparent.png"
                    alt="MilerDev"
                    style={{ width: 32, height: 32, flexShrink: 0 }}
                  />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, lineHeight: 1.1 }}>MilerDev Admin</div>
                  <div style={{ color: '#93c5fd', fontSize: '0.68rem', marginTop: '3px' }}>Control surface</div>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation"
                className="admin-mobile-menu-button"
                style={{ width: '40px', height: '40px', borderRadius: '14px', border: '1px solid rgba(148,163,184,0.22)', background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', zIndex: 1 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div style={{ overflowY: 'auto', padding: '16px 12px', display: 'grid', gap: '16px' }}>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 10px 8px' }}>
                  Core
                </div>
                <div style={{ display: 'grid', gap: '4px' }}>
                  {adminPrimaryLinks.map((link) => {
                    const active = isActive(link.href, link.exact);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMenuOpen(false)}
                        className={active ? 'admin-mobile-nav-link admin-mobile-nav-link-active' : 'admin-mobile-nav-link'}
                        style={{
                          color: active ? '#ffffff' : '#cbd5e1',
                          textDecoration: 'none',
                          fontSize: '0.84rem',
                          fontWeight: active ? 700 : 500,
                          padding: '11px 12px',
                          borderRadius: '14px',
                          background: active ? 'linear-gradient(135deg, rgba(37,99,235,0.28), rgba(29,78,216,0.2))' : 'transparent',
                          border: active ? '1px solid rgba(96,165,250,0.28)' : '1px solid transparent',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <NavIcon name={link.icon} size={16} />
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {adminSecondaryLinkGroups.map((group) => (
                <div key={group.title}>
                  <div style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 10px 8px' }}>
                    {group.title}
                  </div>
                  <div style={{ display: 'grid', gap: '4px' }}>
                    {group.items.map((link) => {
                      const active = isActive(link.href);
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMenuOpen(false)}
                          className={active ? 'admin-mobile-nav-link admin-mobile-nav-link-active' : 'admin-mobile-nav-link'}
                          style={{
                            color: active ? '#ffffff' : '#94a3b8',
                            textDecoration: 'none',
                            fontSize: '0.8125rem',
                            fontWeight: active ? 600 : 500,
                            padding: '10px 12px',
                            borderRadius: '14px',
                            background: active ? 'rgba(59,130,246,0.14)' : 'transparent',
                            border: active ? '1px solid rgba(96,165,250,0.24)' : '1px solid transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                          }}
                        >
                          <NavIcon name={link.icon} size={15} />
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: '16px', borderTop: '1px solid rgba(148,163,184,0.16)' }}>
              <div className="admin-mobile-session-card">
                <div style={{ color: '#e2e8f0', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userName}
                </div>
                <div style={{ color: '#64748b', fontSize: '0.74rem', marginBottom: '12px' }}>Admin session</div>
              </div>
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="admin-mobile-home-link"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', textDecoration: 'none', fontSize: '0.78rem', padding: '9px 12px', borderRadius: '12px', border: '1px solid #334155', background: '#111827' }}
              >
                กลับหน้าเว็บ
              </Link>
            </div>
          </nav>
        </>
      )}

      <style>{`
        .admin-mobile-header { display: none; }
        .admin-mobile-header-shell::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(37,99,235,0.1), rgba(37,99,235,0));
          pointer-events: none;
        }
        .admin-mobile-logo-shell {
          width: 40px;
          height: 40px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04));
          border: 1px solid rgba(148,163,184,0.24);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 12px 20px rgba(2, 6, 23, 0.24);
          flex-shrink: 0;
        }
        .admin-mobile-user-chip {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(59,130,246,0.16);
          border: 1px solid rgba(96,165,250,0.22);
          color: #dbeafe;
          font-size: 0.78rem;
          font-weight: 700;
        }
        .admin-mobile-menu-button,
        .admin-mobile-home-link,
        .admin-mobile-nav-link {
          transition: transform 180ms ease, border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease;
        }
        .admin-mobile-menu-button:hover,
        .admin-mobile-home-link:hover {
          transform: translateY(-1px);
          border-color: rgba(96,165,250,0.28) !important;
        }
        .admin-mobile-drawer::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at top left, rgba(59,130,246,0.16), transparent 24%),
            linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0));
          pointer-events: none;
        }
        .admin-mobile-drawer-orb {
          position: absolute;
          width: 144px;
          height: 144px;
          top: -44px;
          right: -44px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(96,165,250,0.34), rgba(96,165,250,0));
          filter: blur(18px);
          pointer-events: none;
        }
        .admin-mobile-nav-link {
          position: relative;
          overflow: hidden;
        }
        .admin-mobile-nav-link::before {
          content: '';
          position: absolute;
          inset: 0 auto 0 0;
          width: 3px;
          border-radius: 999px;
          background: linear-gradient(180deg, #60a5fa, #2563eb);
          opacity: 0;
          transition: opacity 180ms ease;
        }
        .admin-mobile-nav-link:hover {
          transform: translateX(2px);
          background: rgba(255,255,255,0.05) !important;
          border-color: rgba(96,165,250,0.18) !important;
        }
        .admin-mobile-nav-link-active {
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.26);
        }
        .admin-mobile-nav-link-active::before {
          opacity: 1;
        }
        .admin-mobile-session-card {
          padding: 12px 12px 10px;
          margin-bottom: 10px;
          border-radius: 16px;
          background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
          border: 1px solid rgba(148,163,184,0.18);
        }
        @media (max-width: 1024px) {
          .admin-mobile-header { display: block !important; }
        }
      `}</style>
    </>
  );
}

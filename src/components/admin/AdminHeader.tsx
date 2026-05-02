'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminAllLinks, adminPrimaryLinks, adminSecondaryLinkGroups } from '@/components/admin/adminNav';
import AdminNavIcon from '@/components/admin/AdminNavIcon';

interface AdminHeaderProps {
  userName: string;
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
  const initial = userName.slice(0, 1).toUpperCase();

  return (
    <>
      <header className="admin-topbar">
        <div className="admin-topbar-title">
          <h1>{activeTitle}</h1>
          <p>Welcome back, {userName}</p>
        </div>

        <label className="admin-topbar-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input type="search" placeholder="Search courses, students, payments..." />
          <span>⌘ K</span>
        </label>

        <div className="admin-topbar-actions">
          <Link href="/admin/courses/new" className="admin-new-button">
            <span>+</span>
            New
          </Link>
          <button type="button" aria-label="Notifications" className="admin-icon-button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 01-3.4 0" />
            </svg>
            <i>3</i>
          </button>
          <Link href="/admin/settings" className="admin-profile-chip" aria-label="Admin profile">
            <span>{initial}</span>
            <b />
          </Link>
        </div>
      </header>

      <header className="admin-mobile-header">
        <Link href="/admin" className="admin-mobile-brand">
          <span>
            <img src="/milerdev-logo-transparent.png" alt="MilerDev" />
          </span>
          <div>
            <strong>MilerDev</strong>
            <small>{activeTitle}</small>
          </div>
        </Link>

        <div className="admin-mobile-actions">
          <Link href="/admin/courses/new" className="admin-mobile-new">+</Link>
          <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open navigation">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {menuOpen ? (
        <>
          <button className="admin-mobile-overlay" type="button" aria-label="Close navigation overlay" onClick={() => setMenuOpen(false)} />
          <nav className="admin-mobile-drawer" aria-label="Mobile admin navigation">
            <div className="admin-mobile-drawer-head">
              <Link href="/admin" onClick={() => setMenuOpen(false)} className="admin-mobile-brand">
                <span>
                  <img src="/milerdev-logo-transparent.png" alt="MilerDev" />
                </span>
                <div>
                  <strong>MilerDev</strong>
                  <small>Admin LMS</small>
                </div>
              </Link>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close navigation">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="admin-mobile-drawer-scroll">
              <div className="admin-mobile-nav-group">
                {adminPrimaryLinks.map((link) => {
                  const active = isActive(link.href, link.exact);
                  return (
                    <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className={active ? 'active' : ''}>
                      <AdminNavIcon name={link.icon} />
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              {adminSecondaryLinkGroups.map((group) => (
                <div className="admin-mobile-nav-group" key={group.title}>
                  <h2>{group.title}</h2>
                  {group.items.map((link) => {
                    const active = isActive(link.href);
                    return (
                      <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className={active ? 'active' : ''}>
                        <AdminNavIcon name={link.icon} />
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="admin-mobile-user">
              <span>{initial}</span>
              <div>
                <strong>{userName}</strong>
                <small>Admin</small>
              </div>
            </div>
          </nav>
        </>
      ) : null}

      <style jsx>{`
        .admin-topbar {
          position: sticky;
          top: 0;
          z-index: 30;
          min-height: 86px;
          display: grid;
          grid-template-columns: minmax(220px, 1fr) minmax(320px, 560px) auto;
          gap: 22px;
          align-items: center;
          padding: 0 28px;
          border-bottom: 1px solid #dbe8f2;
          background: rgba(255, 255, 255, 0.86);
          backdrop-filter: blur(18px);
        }

        .admin-topbar-title h1 {
          margin: 0;
          color: #102033;
          font-size: 1.12rem;
          line-height: 1.2;
        }

        .admin-topbar-title p {
          margin: 5px 0 0;
          color: #64758b;
          font-size: 0.82rem;
        }

        .admin-topbar-search {
          min-height: 44px;
          display: grid;
          grid-template-columns: 20px minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          padding: 0 12px;
          border: 1px solid #dbe8f2;
          border-radius: 10px;
          background: #ffffff;
          box-shadow: 0 8px 20px rgba(16, 32, 51, 0.04);
          color: #91a1b5;
        }

        .admin-topbar-search svg,
        .admin-icon-button svg,
        .admin-mobile-actions svg,
        .admin-mobile-drawer-head button svg {
          width: 20px;
          height: 20px;
        }

        .admin-topbar-search input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #102033;
          font-size: 0.88rem;
        }

        .admin-topbar-search span {
          min-height: 24px;
          display: inline-flex;
          align-items: center;
          border-radius: 6px;
          background: #f2f7fc;
          padding: 0 8px;
          color: #64758b;
          font-size: 0.72rem;
          font-weight: 900;
        }

        .admin-topbar-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .admin-new-button {
          min-height: 44px;
          display: inline-flex;
          gap: 8px;
          align-items: center;
          justify-content: center;
          padding: 0 16px;
          border-radius: 8px;
          background: #02abff;
          color: #ffffff;
          text-decoration: none;
          font-size: 0.84rem;
          font-weight: 900;
          box-shadow: 0 12px 24px rgba(2, 171, 255, 0.2);
        }

        .admin-new-button span {
          font-size: 1.1rem;
          line-height: 1;
        }

        .admin-icon-button {
          position: relative;
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border: 1px solid #dbe8f2;
          border-radius: 8px;
          background: #ffffff;
          color: #526981;
          cursor: pointer;
        }

        .admin-icon-button i {
          position: absolute;
          top: -6px;
          right: -5px;
          min-width: 18px;
          height: 18px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: #02abff;
          color: #ffffff;
          font-size: 0.66rem;
          font-style: normal;
          font-weight: 900;
        }

        .admin-profile-chip {
          position: relative;
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: linear-gradient(135deg, #102033, #34465c);
          color: #ffffff;
          text-decoration: none;
          font-weight: 900;
        }

        .admin-profile-chip b {
          position: absolute;
          right: 1px;
          bottom: 2px;
          width: 11px;
          height: 11px;
          border: 2px solid #ffffff;
          border-radius: 999px;
          background: #11a66a;
        }

        .admin-mobile-header,
        .admin-mobile-overlay,
        .admin-mobile-drawer {
          display: none;
        }

        .admin-mobile-brand {
          display: flex;
          gap: 10px;
          align-items: center;
          min-width: 0;
          color: #102033;
          text-decoration: none;
        }

        .admin-mobile-brand > span {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 10px;
          background: linear-gradient(135deg, #02abff, #0089d6);
        }

        .admin-mobile-brand img {
          width: 28px;
          height: 28px;
        }

        .admin-mobile-brand strong,
        .admin-mobile-user strong {
          display: block;
          color: #102033;
          font-size: 0.9rem;
          line-height: 1.2;
        }

        .admin-mobile-brand small,
        .admin-mobile-user small {
          color: #64758b;
          font-size: 0.72rem;
        }

        .admin-mobile-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .admin-mobile-new,
        .admin-mobile-actions button,
        .admin-mobile-drawer-head button {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border: 1px solid #dbe8f2;
          border-radius: 8px;
          background: #ffffff;
          color: #102033;
          text-decoration: none;
          cursor: pointer;
          font-weight: 900;
        }

        .admin-mobile-new {
          border-color: #02abff;
          background: #02abff;
          color: #ffffff;
          font-size: 1.25rem;
        }

        @media (max-width: 1024px) {
          .admin-topbar {
            display: none;
          }

          .admin-mobile-header {
            position: sticky;
            top: 0;
            z-index: 40;
            min-height: 72px;
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: center;
            padding: 0 16px;
            border-bottom: 1px solid #dbe8f2;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(18px);
          }

          .admin-mobile-overlay {
            position: fixed;
            inset: 0;
            z-index: 49;
            display: block;
            border: 0;
            background: rgba(16, 32, 51, 0.42);
          }

          .admin-mobile-drawer {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            z-index: 50;
            width: min(88vw, 330px);
            display: grid;
            grid-template-rows: auto 1fr auto;
            border-right: 1px solid #dbe8f2;
            background: #ffffff;
            box-shadow: 0 20px 60px rgba(16, 32, 51, 0.22);
          }

          .admin-mobile-drawer-head {
            min-height: 72px;
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: center;
            padding: 0 16px;
            border-bottom: 1px solid #e8f1f8;
          }

          .admin-mobile-drawer-scroll {
            display: grid;
            align-content: start;
            gap: 18px;
            overflow-y: auto;
            padding: 14px;
          }

          .admin-mobile-nav-group {
            display: grid;
            gap: 4px;
          }

          .admin-mobile-nav-group h2 {
            margin: 10px 10px 6px;
            color: #91a1b5;
            font-size: 0.68rem;
            font-weight: 900;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .admin-mobile-nav-group a {
            min-height: 42px;
            display: flex;
            gap: 12px;
            align-items: center;
            border-radius: 8px;
            padding: 0 12px;
            color: #526981;
            text-decoration: none;
            font-size: 0.86rem;
            font-weight: 750;
          }

          .admin-mobile-nav-group a.active {
            background: linear-gradient(135deg, #02abff, #0089d6);
            color: #ffffff;
            box-shadow: 0 12px 24px rgba(2, 171, 255, 0.2);
          }

          .admin-mobile-user {
            display: flex;
            gap: 10px;
            align-items: center;
            padding: 16px;
            border-top: 1px solid #e8f1f8;
          }

          .admin-mobile-user > span {
            width: 36px;
            height: 36px;
            display: grid;
            place-items: center;
            border-radius: 999px;
            background: #eefaff;
            color: #0089d6;
            font-weight: 900;
          }
        }
      `}</style>
    </>
  );
}

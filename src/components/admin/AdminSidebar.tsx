'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminPrimaryLinks, adminSecondaryLinkGroups } from '@/components/admin/adminNav';
import AdminNavIcon from '@/components/admin/AdminNavIcon';

interface AdminSidebarProps {
  userName: string;
}

export default function AdminSidebar({ userName }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <Link href="/admin" className="admin-sidebar-logo">
          <span>MD</span>
          <div>
            <strong>MilerDev</strong>
            <small>Admin LMS</small>
          </div>
        </Link>
      </div>

      <nav className="admin-sidebar-nav" aria-label="Admin navigation">
        <div className="admin-sidebar-nav-group">
          {adminPrimaryLinks.map((link) => {
            const active = isActive(link.href, link.exact);
            return (
              <Link key={link.href} href={link.href} className={active ? 'admin-sidebar-nav-link active' : 'admin-sidebar-nav-link'}>
                <AdminNavIcon name={link.icon} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>

        {adminSecondaryLinkGroups.map((group) => (
          <div className="admin-sidebar-nav-group" key={group.title}>
            <h2>{group.title}</h2>
            {group.items.map((link) => {
              const active = isActive(link.href);
              return (
                <Link key={link.href} href={link.href} className={active ? 'admin-sidebar-nav-link active' : 'admin-sidebar-nav-link'}>
                  <AdminNavIcon name={link.icon} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <div className="admin-sidebar-upgrade">
          <div className="admin-sidebar-crown">+</div>
          <strong>Course ops ready</strong>
          <p>จัดการคอร์ส ผู้เรียน และยอดชำระเงินจากที่เดียว</p>
          <Link href="/admin/courses/new">New Course</Link>
        </div>

        <Link href="/" className="admin-sidebar-site-link">
          <span>↗</span>
          ไปหน้าเว็บ
        </Link>

        <div className="admin-sidebar-user">
          <span>{userName.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{userName}</strong>
            <small>Admin</small>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .admin-sidebar {
          width: 250px;
          height: 100vh;
          flex: 0 0 250px;
          position: sticky;
          top: 0;
          align-self: flex-start;
          display: grid;
          grid-template-rows: auto 1fr auto;
          border-right: 1px solid #dbe8f2;
          background: rgba(255, 255, 255, 0.98);
          box-shadow: 8px 0 28px rgba(16, 32, 51, 0.04);
          overflow: hidden;
        }

        .admin-sidebar-brand {
          padding: 16px 16px 12px;
        }

        .admin-sidebar-logo {
          display: flex;
          gap: 12px;
          align-items: center;
          color: #102033;
          text-decoration: none;
        }

        .admin-sidebar-logo > span {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 9px;
          background: linear-gradient(135deg, #02abff, #0089d6);
          color: #ffffff;
          font-size: 0.78rem;
          font-weight: 950;
          letter-spacing: 0;
          box-shadow: 0 14px 24px rgba(2, 171, 255, 0.22);
        }

        .admin-sidebar-logo strong,
        .admin-sidebar-user strong,
        .admin-sidebar-upgrade strong {
          display: block;
          color: #102033;
          font-size: 0.92rem;
          line-height: 1.2;
          white-space: nowrap;
        }

        .admin-sidebar-logo small,
        .admin-sidebar-user small {
          color: #64758b;
          font-size: 0.74rem;
        }

        .admin-sidebar-nav {
          display: grid;
          align-content: start;
          gap: 14px;
          overflow-y: auto;
          padding: 4px 12px 14px;
          scrollbar-width: thin;
          scrollbar-color: #c9d9e7 transparent;
        }

        .admin-sidebar-nav::-webkit-scrollbar {
          width: 8px;
        }

        .admin-sidebar-nav::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: #c9d9e7;
        }

        .admin-sidebar-nav-group {
          display: grid;
          gap: 3px;
        }

        .admin-sidebar-nav-group h2 {
          margin: 12px 10px 6px;
          color: #91a1b5;
          font-size: 0.68rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .admin-sidebar-nav-link {
          min-height: 38px;
          display: flex !important;
          gap: 10px;
          align-items: center;
          border-radius: 8px;
          padding: 0 10px;
          color: #526981;
          text-decoration: none;
          font-size: 0.84rem;
          font-weight: 750;
          line-height: 1;
          transition: background 160ms ease, color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
        }

        .admin-sidebar-nav-link svg {
          width: 18px !important;
          height: 18px !important;
          flex: 0 0 auto;
        }

        .admin-sidebar-nav-link span {
          display: block;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .admin-sidebar-nav-link:hover {
          background: #f2f9ff;
          color: #0089d6;
          transform: translateX(1px);
        }

        .admin-sidebar-nav-link.active {
          background: linear-gradient(135deg, #02abff, #0089d6);
          color: #ffffff;
          box-shadow: 0 12px 24px rgba(2, 171, 255, 0.22);
        }

        .admin-sidebar-footer {
          display: grid;
          gap: 10px;
          padding: 12px 16px 14px;
          border-top: 1px solid #e8f1f8;
          background: rgba(255, 255, 255, 0.96);
        }

        .admin-sidebar-upgrade {
          display: grid;
          gap: 7px;
          padding: 12px;
          border-radius: 12px;
          background: linear-gradient(135deg, #02abff, #0089d6);
          color: #ffffff;
          box-shadow: 0 18px 32px rgba(2, 171, 255, 0.2);
        }

        .admin-sidebar-upgrade strong,
        .admin-sidebar-upgrade p {
          color: #ffffff;
        }

        .admin-sidebar-upgrade p {
          margin: 0;
          font-size: 0.72rem;
          line-height: 1.45;
          opacity: 0.9;
        }

        .admin-sidebar-upgrade a {
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: #ffffff;
          color: #0089d6;
          text-decoration: none;
          font-size: 0.78rem;
          font-weight: 900;
        }

        .admin-sidebar-crown {
          width: 26px;
          height: 26px;
          display: grid;
          place-items: center;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.18);
          font-weight: 900;
        }

        .admin-sidebar-site-link {
          min-height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid #dbe8f2;
          border-radius: 8px;
          background: #ffffff;
          color: #102033;
          text-decoration: none;
          font-size: 0.82rem;
          font-weight: 850;
        }

        .admin-sidebar-site-link span {
          color: #0089d6;
          font-weight: 900;
        }

        .admin-sidebar-user {
          display: flex;
          gap: 10px;
          align-items: center;
          min-width: 0;
        }

        .admin-sidebar-user > span {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 999px;
          background: #eefaff;
          color: #0089d6;
          font-weight: 900;
        }

        .admin-sidebar-user div {
          min-width: 0;
        }

        .admin-sidebar-user strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @media (max-width: 1024px) {
          .admin-sidebar {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
}

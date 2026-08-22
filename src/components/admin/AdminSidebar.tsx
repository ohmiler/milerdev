'use client';

import { ExternalLink, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import AdminNavIcon from '@/components/admin/AdminNavIcon';
import { adminPrimaryLinks, adminSecondaryLinkGroups, isAdminNavActive } from '@/components/admin/adminNav';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
  userName: string;
}

export default function AdminSidebar({ userName }: AdminSidebarProps) {
  const pathname = usePathname();
  const initial = userName.slice(0, 1).toUpperCase();
  const linkClass = (active: boolean) => cn(
    'flex min-h-9 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors',
    active ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  );

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
      <div className="border-b border-border p-4">
        <Link href="/admin" className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30">
          <span className="grid size-10 place-items-center rounded-lg bg-primary text-xs font-black text-primary-foreground">MD</span>
          <div className="min-w-0">
            <strong className="block truncate text-sm font-semibold text-foreground">MilerDev</strong>
            <span className="block text-xs text-muted-foreground">ศูนย์จัดการระบบ</span>
          </div>
        </Link>
      </div>

      <nav aria-label="เมนูผู้ดูแลระบบ" className="flex-1 space-y-5 overflow-y-auto p-3">
        <div className="space-y-1">
          {adminPrimaryLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(isAdminNavActive(pathname, link))}>
              <AdminNavIcon name={link.icon} />
              <span className="truncate">{link.label}</span>
            </Link>
          ))}
        </div>

        {adminSecondaryLinkGroups.map((group) => (
          <section key={group.title}>
            <h2 className="mb-1.5 px-3 text-[0.68rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{group.title}</h2>
            <div className="space-y-1">
              {group.items.map((link) => (
                <Link key={link.href} href={link.href} className={linkClass(isAdminNavActive(pathname, link))}>
                  <AdminNavIcon name={link.icon} />
                  <span className="truncate">{link.label}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </nav>

      <div className="space-y-3 border-t border-border p-4">
        <Button asChild variant="outline" size="sm" className="w-full justify-start">
          <Link href="/"><ExternalLink />ไปหน้าเว็บไซต์</Link>
        </Button>
        <Link href="/admin/settings" className="flex items-center gap-3 rounded-lg p-1 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-foreground">{initial}</span>
          <div className="min-w-0 flex-1">
            <strong className="block truncate text-sm font-medium text-foreground">{userName}</strong>
            <span className="block text-xs text-muted-foreground">ผู้ดูแลระบบ</span>
          </div>
          <Settings className="size-4 text-muted-foreground" aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}

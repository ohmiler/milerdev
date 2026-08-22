'use client';

import { ExternalLink, Menu, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import AdminNavIcon from '@/components/admin/AdminNavIcon';
import { adminPrimaryLinks, adminSecondaryLinkGroups, getAdminNavTitle, isAdminNavActive } from '@/components/admin/adminNav';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface AdminHeaderProps {
  userName: string;
}

export default function AdminHeader({ userName }: AdminHeaderProps) {
  const pathname = usePathname();
  const activeTitle = getAdminNavTitle(pathname);
  const initial = userName.slice(0, 1).toUpperCase();
  const linkClass = (active: boolean) => cn(
    'flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
    active ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  );

  return (
    <>
      <header className="sticky top-0 z-30 hidden min-h-20 items-center justify-between gap-4 border-b border-border bg-background/95 px-7 backdrop-blur lg:flex">
        <div>
          <p className="text-xs font-medium text-muted-foreground">ศูนย์จัดการ MilerDev</p>
          <h1 className="mt-1 font-heading text-lg font-semibold text-foreground">{activeTitle}</h1>
        </div>
        <Link href="/admin/settings" aria-label="เปิดการตั้งค่าผู้ดูแลระบบ" className="flex items-center gap-3 rounded-lg p-1.5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30">
          <div className="hidden text-right xl:block">
            <strong className="block max-w-52 truncate text-sm font-medium text-foreground">{userName}</strong>
            <span className="block text-xs text-muted-foreground">ผู้ดูแลระบบ</span>
          </div>
          <span className="grid size-10 place-items-center rounded-full bg-muted text-sm font-semibold text-foreground">{initial}</span>
          <Settings className="size-4 text-muted-foreground" aria-hidden="true" />
        </Link>
      </header>

      <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden">
        <Link href="/admin" className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-[0.68rem] font-black text-primary-foreground">MD</span>
          <div className="min-w-0">
            <strong className="block truncate text-sm font-semibold text-foreground">MilerDev</strong>
            <span className="block truncate text-xs text-muted-foreground">{activeTitle}</span>
          </div>
        </Link>

        <div className="flex items-center gap-1.5">
          <Button asChild variant="ghost" size="icon-sm">
            <Link href="/" aria-label="ไปหน้าเว็บไซต์"><ExternalLink /></Link>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon-sm" aria-label="เปิดเมนูผู้ดูแลระบบ"><Menu /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(88vw,22rem)] p-0">
              <SheetHeader className="border-b border-border p-5 pr-14 text-left">
                <SheetTitle>MilerDev Admin</SheetTitle>
                <SheetDescription>เลือกส่วนที่ต้องการจัดการ</SheetDescription>
              </SheetHeader>

              <nav aria-label="เมนูผู้ดูแลระบบบนมือถือ" className="flex-1 space-y-5 overflow-y-auto p-4">
                <div className="space-y-1">
                  {adminPrimaryLinks.map((link) => (
                    <SheetClose asChild key={link.href}>
                      <Link href={link.href} className={linkClass(isAdminNavActive(pathname, link))}>
                        <AdminNavIcon name={link.icon} />
                        <span>{link.label}</span>
                      </Link>
                    </SheetClose>
                  ))}
                </div>

                {adminSecondaryLinkGroups.map((group) => (
                  <section key={group.title}>
                    <h2 className="mb-1.5 px-3 text-[0.68rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{group.title}</h2>
                    <div className="space-y-1">
                      {group.items.map((link) => (
                        <SheetClose asChild key={link.href}>
                          <Link href={link.href} className={linkClass(isAdminNavActive(pathname, link))}>
                            <AdminNavIcon name={link.icon} />
                            <span>{link.label}</span>
                          </Link>
                        </SheetClose>
                      ))}
                    </div>
                  </section>
                ))}
              </nav>

              <SheetFooter className="border-t border-border p-4">
                <SheetClose asChild>
                  <Link href="/admin/settings" className="flex items-center gap-3 rounded-lg p-1">
                    <span className="grid size-9 place-items-center rounded-full bg-muted text-xs font-semibold">{initial}</span>
                    <div className="min-w-0 text-left">
                      <strong className="block truncate text-sm font-medium">{userName}</strong>
                      <span className="block text-xs text-muted-foreground">ผู้ดูแลระบบ</span>
                    </div>
                  </Link>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </header>
    </>
  );
}

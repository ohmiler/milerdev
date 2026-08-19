import type { ReactNode } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type AccountRoute = 'certificates' | 'payments' | 'profile' | 'settings';

interface LearnerAccountShellProps {
  children: ReactNode;
  current: AccountRoute;
  title: string;
  description: string;
}

const accountLinks: Array<{ key: AccountRoute | 'dashboard'; href: string; label: string }> = [
  { key: 'dashboard', href: '/dashboard', label: 'ภาพรวมการเรียน' },
  { key: 'certificates', href: '/dashboard/certificates', label: 'ใบรับรอง' },
  { key: 'payments', href: '/dashboard/payments', label: 'การชำระเงิน' },
  { key: 'profile', href: '/profile', label: 'โปรไฟล์' },
  { key: 'settings', href: '/settings', label: 'ตั้งค่าบัญชี' },
];

export default function LearnerAccountShell({ children, current, title, description }: LearnerAccountShellProps) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-muted/20 py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <header className="mb-10 flex flex-col gap-6 border-b pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
              <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">{description}</p>
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              บัญชีผู้เรียน<br />
              <span>ข้อมูลของคุณในที่เดียว</span>
            </p>
          </header>

          <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <Card className="h-fit p-3 lg:sticky lg:top-24" aria-label="เมนูบัญชีผู้เรียน">
              <nav>
              <p className="px-3 py-2 text-sm font-semibold text-muted-foreground">เมนูบัญชี</p>
              {accountLinks.map((item) => {
                const isCurrent = item.key === current;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={cn('flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition hover:bg-muted', isCurrent && 'bg-primary text-primary-foreground hover:bg-primary')}
                    aria-current={isCurrent ? 'page' : undefined}
                  >
                    {item.label}
                    <span aria-hidden="true">{isCurrent ? '●' : '↗'}</span>
                  </Link>
                );
              })}
              </nav>
            </Card>
            <div className="min-w-0">{children}</div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

import type { ReactNode } from 'react';
import Link from 'next/link';

import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import NavigationBreadcrumbs from '@/components/layout/NavigationBreadcrumbs';
import { ACCOUNT_MENU_LINKS } from '@/components/layout/navigation-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  getAccountDestination,
  type AccountNavigationKey,
} from '@/lib/navigation-model';

interface LearnerAccountShellProps {
  children: ReactNode;
  current: AccountNavigationKey;
  title: ReactNode;
  description: string;
}

export default function LearnerAccountShell({ children, current, title, description }: LearnerAccountShellProps) {
  const currentDestination = getAccountDestination(current);
  const breadcrumbs = current === 'dashboard'
    ? [
        { href: '/', label: 'หน้าแรก' },
        { label: currentDestination.label },
      ]
    : [
        { href: '/', label: 'หน้าแรก' },
        { href: '/dashboard', label: 'บัญชีผู้เรียน' },
        { label: currentDestination.label },
      ];

  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="min-h-screen bg-muted/20 py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <header className="mb-10 flex flex-col gap-6 border-b pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <NavigationBreadcrumbs className="mb-5" items={breadcrumbs} />
              <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
              <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">{description}</p>
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              บัญชีผู้เรียน<br />
              <span>ข้อมูลของคุณในที่เดียว</span>
            </p>
          </header>

          <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <aside className="h-fit lg:sticky lg:top-24" aria-label="เมนูบัญชีผู้เรียน">
              <Card size="sm">
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">เมนูบัญชี</CardTitle>
                </CardHeader>
                <CardContent>
                  <nav className="flex flex-col gap-1">
                    {ACCOUNT_MENU_LINKS.map((item) => {
                      const isCurrent = item.key === current;
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.key}
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted [&_svg]:size-4',
                            isCurrent && 'bg-primary text-primary-foreground hover:bg-primary',
                          )}
                          aria-current={isCurrent ? 'page' : undefined}
                        >
                          <Icon aria-hidden="true" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </nav>
                </CardContent>
              </Card>
            </aside>
            <div className="min-w-0">{children}</div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

import MainContent from '@/components/layout/MainContent';
import type { ReactNode } from 'react';
import Link from 'next/link';

import AccountTabs from '@/components/account/AccountTabs';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import NavigationBreadcrumbs from '@/components/layout/NavigationBreadcrumbs';
import { ACCOUNT_MENU_LINKS } from '@/components/layout/navigation-config';
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
        { href: '/dashboard', label: 'บัญชีสมาชิก' },
        { label: currentDestination.label },
      ];

  return (
    <>
      <Navbar />
      <MainContent className="min-h-screen bg-muted/20 py-6 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Compact on phones so the page's own content starts within the first screen. */}
          <header className="mb-5 border-b pb-5 sm:mb-10 sm:pb-8">
            <NavigationBreadcrumbs className="mb-5 hidden sm:block" items={breadcrumbs} />
            <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:mt-3 sm:text-base sm:leading-7">{description}</p>
          </header>

          <div className="grid gap-6 sm:gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
            {/* A scrollable row of tabs on phones, a side card on wide screens. */}
            <aside className="h-fit min-w-0 lg:sticky lg:top-24 lg:rounded-xl lg:border lg:bg-card lg:p-3" aria-label="เมนูบัญชีสมาชิก">
              <p className="hidden px-3 pt-1 pb-2 text-sm font-medium text-muted-foreground lg:block">เมนูบัญชี</p>
              <AccountTabs className="relative -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0">
                {ACCOUNT_MENU_LINKS.map((item) => {
                  const isCurrent = item.key === current;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={cn(
                        'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border bg-card px-3.5 py-2 text-sm font-medium transition-colors hover:bg-muted lg:gap-3 lg:rounded-lg lg:border-0 lg:bg-transparent lg:px-3 lg:py-2.5 [&_svg]:size-4',
                        isCurrent && 'border-primary bg-primary text-primary-foreground hover:bg-primary lg:bg-primary',
                      )}
                      aria-current={isCurrent ? 'page' : undefined}
                    >
                      <Icon aria-hidden="true" />
                      {item.label}
                    </Link>
                  );
                })}
              </AccountTabs>
            </aside>
            <div className="min-w-0">{children}</div>
          </div>
        </div>
      </MainContent>
      <Footer />
    </>
  );
}

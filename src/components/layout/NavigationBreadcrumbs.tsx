import { Fragment } from 'react';
import Link from 'next/link';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';

export type NavigationBreadcrumbItem = Readonly<{
  href?: string;
  label: string;
}>;

export default function NavigationBreadcrumbs({
  items,
  className,
}: {
  items: readonly NavigationBreadcrumbItem[];
  className?: string;
}) {
  return (
    <Breadcrumb aria-label="เส้นทางนำทาง" className={cn('min-w-0', className)}>
      <BreadcrumbList className="min-w-0 flex-nowrap overflow-hidden">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <Fragment key={`${item.href ?? 'current'}:${item.label}`}>
              <BreadcrumbItem className={cn(isCurrent && 'min-w-0')}>
                {item.href && !isCurrent ? (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="truncate">{item.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {!isCurrent ? <BreadcrumbSeparator /> : null}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

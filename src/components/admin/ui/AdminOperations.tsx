import { CircleAlert, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export type AdminTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const toneClasses: Record<AdminTone, string> = {
  neutral: 'border-border bg-muted/60 text-foreground',
  info: 'border-primary/20 bg-secondary text-secondary-foreground',
  success: 'border-[var(--color-success)]/20 bg-[var(--color-success-soft)] text-[var(--color-success-strong)]',
  warning: 'border-[var(--color-warning)]/25 bg-[var(--color-warning-soft)] text-[var(--color-warning-strong)]',
  danger: 'border-destructive/20 bg-[var(--color-error-soft)] text-[var(--color-error-strong)]',
};

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 max-w-3xl">
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-primary uppercase">{eyebrow}</p>
        ) : null}
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">{description}</p> : null}
        {meta ? <div className="mt-3 text-xs text-muted-foreground">{meta}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function AdminMetricCard({
  label,
  value,
  detail,
  icon,
  tone = 'neutral',
}: {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  tone?: AdminTone;
}) {
  return (
    <Card size="sm" className="gap-3 rounded-xl shadow-none">
      <CardHeader className="flex-row items-start justify-between gap-3 pb-0">
        <div>
          <CardDescription className="text-xs font-medium">{label}</CardDescription>
          <CardTitle className="mt-2 text-2xl font-semibold tabular-nums">{value}</CardTitle>
        </div>
        {icon ? (
          <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg border [&_svg]:size-4', toneClasses[tone])}>
            {icon}
          </span>
        ) : null}
      </CardHeader>
      {detail ? <CardContent className="text-xs leading-5 text-muted-foreground">{detail}</CardContent> : null}
    </Card>
  );
}

export function AdminSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('gap-4 rounded-xl shadow-none', className)}>
      <CardHeader className="border-b border-border pb-4">
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription className="mt-1.5 leading-5">{description}</CardDescription> : null}
        </div>
        {actions ? <CardAction className="flex flex-wrap items-center justify-end gap-2">{actions}</CardAction> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function AdminStatusBadge({
  tone = 'neutral',
  children,
  className,
  ...props
}: React.ComponentProps<typeof Badge> & { tone?: AdminTone }) {
  return (
    <Badge
      variant="outline"
      className={cn('h-6 rounded-full px-2.5 font-semibold', toneClasses[tone], className)}
      {...props}
    >
      {children}
    </Badge>
  );
}

export function AdminEmptyState({
  title,
  description,
  action,
  icon,
  tone = 'neutral',
}: {
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  tone?: AdminTone;
}) {
  return (
    <Empty className={cn('min-h-44 border', toneClasses[tone])}>
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon ?? <Inbox aria-hidden />}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription className="text-current/80">{description}</EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}

export function AdminLoadingState({
  title = 'กำลังโหลดข้อมูล',
  description = 'โปรดรอสักครู่ ระบบกำลังเตรียมข้อมูลล่าสุด',
}: {
  title?: ReactNode;
  description?: ReactNode;
}) {
  return (
    <Empty className="min-h-44 border bg-muted/30">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Spinner aria-hidden />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function AdminErrorState({
  title = 'ไม่สามารถโหลดข้อมูลได้',
  description,
  action,
}: {
  title?: ReactNode;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Alert variant="destructive">
      <CircleAlert aria-hidden />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
      {action ? <AlertAction>{action}</AlertAction> : null}
    </Alert>
  );
}

export function AdminPendingLabel({ children }: { children: ReactNode }) {
  return (
    <>
      <Spinner data-icon="inline-start" aria-hidden />
      {children}
    </>
  );
}

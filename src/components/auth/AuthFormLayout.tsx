import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export function AuthError({ children }: { children: ReactNode }) {
  return <Alert variant="destructive" className="mb-5"><AlertCircle /><AlertDescription>{children}</AlertDescription></Alert>;
}

export function AuthField({ htmlFor, label, trailing, help, children }: { htmlFor: string; label: string; trailing?: ReactNode; help?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex min-h-5 items-center justify-between gap-3"><Label htmlFor={htmlFor}>{label}</Label>{trailing}</div>
      {children}
      {help ? <div className="text-xs leading-5 text-muted-foreground">{help}</div> : null}
    </div>
  );
}

export function PasswordField({ children, action }: { children: ReactNode; action: ReactNode }) {
  return <div className="relative [&_input]:pr-12">{children}<div className="absolute top-1/2 right-2 -translate-y-1/2 [&_button]:flex [&_button]:size-9 [&_button]:items-center [&_button]:justify-center [&_button]:rounded-lg [&_button]:text-muted-foreground [&_button]:hover:bg-muted [&_svg]:size-4">{action}</div></div>;
}

export function AuthDivider({ children }: { children: ReactNode }) {
  return <div className="relative my-6 flex items-center justify-center"><Separator /><span className="absolute bg-card px-3 text-xs text-muted-foreground">{children}</span></div>;
}

export function AuthFootnote({ children }: { children: ReactNode }) {
  return <p className="mt-5 text-center text-sm leading-6 text-muted-foreground [&_a]:font-semibold [&_a]:text-foreground [&_a]:underline-offset-4 [&_a]:hover:underline">{children}</p>;
}

export function RecoveryState({ tone, title, children, actions }: { tone: 'success' | 'error'; title: string; children: ReactNode; actions: ReactNode }) {
  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <section className={cn('rounded-2xl border p-6', tone === 'success' ? 'border-emerald-200 bg-emerald-50/70' : 'border-destructive/20 bg-destructive/5')} aria-labelledby="recovery-state-title">
      <Icon className={cn('mb-4 size-8', tone === 'success' ? 'text-emerald-700' : 'text-destructive')} aria-hidden="true" />
      <h2 id="recovery-state-title" className="text-xl font-semibold">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">{children}</div>
      <div className="mt-6 flex flex-wrap gap-3">{actions}</div>
    </section>
  );
}

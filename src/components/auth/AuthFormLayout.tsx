import type { ComponentProps, ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';

export function AuthError({
  children,
  live = 'assertive',
}: {
  children: ReactNode;
  live?: 'assertive' | 'polite';
}) {
  return (
    <Alert
      variant={'destructive'}
      className={'mb-5'}
      role={live === 'polite' ? 'status' : 'alert'}
      aria-live={live}
    >
      <AlertCircle aria-hidden="true" />
      <AlertTitle>ไม่สามารถดำเนินการได้</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

export function AuthNotice({ children }: { children: ReactNode }) {
  return (
    <Alert variant={'success'} role={'status'} aria-live={'polite'} className={'mb-5'}>
      <CheckCircle2 aria-hidden={'true'} />
      <AlertTitle>ดำเนินการสำเร็จ</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

export function AuthField({
  htmlFor,
  label,
  trailing,
  help,
  children,
  invalid = false,
  error,
}: {
  htmlFor: string;
  label: string;
  trailing?: ReactNode;
  help?: ReactNode;
  children: ReactNode;
  invalid?: boolean;
  error?: { id: string; message: string };
}) {
  return (
    <Field data-invalid={invalid || undefined}>
      <div className="flex min-h-5 items-center justify-between gap-3">
        <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
        {trailing}
      </div>
      {children}
      {error ? <FieldError id={error.id}>{error.message}</FieldError> : null}
      {help ? <FieldDescription>{help}</FieldDescription> : null}
    </Field>
  );
}

interface PasswordInputProps extends Omit<ComponentProps<typeof InputGroupInput>, 'type'> {
  visible: boolean;
  onVisibilityChange: () => void;
  showLabel?: string;
  hideLabel?: string;
}

export function PasswordInput({
  visible,
  onVisibilityChange,
  showLabel = 'แสดงรหัสผ่าน',
  hideLabel = 'ซ่อนรหัสผ่าน',
  ...props
}: PasswordInputProps) {
  return (
    <InputGroup>
      <InputGroupInput type={visible ? 'text' : 'password'} {...props} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-sm"
          onClick={onVisibilityChange}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

export function AuthDivider({ children }: { children: ReactNode }) {
  return <FieldSeparator className="my-6">{children}</FieldSeparator>;
}

export function AuthFootnote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-5 text-center text-sm leading-6 text-muted-foreground [&_a]:font-semibold [&_a]:text-foreground [&_a]:underline-offset-4 [&_a]:hover:underline">
      {children}
    </p>
  );
}

export function RecoveryState({
  tone,
  title,
  children,
  actions,
}: {
  tone: 'success' | 'error';
  title: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <Alert
      variant={tone === 'error' ? 'destructive' : 'success'}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
    >
      <Icon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <div className="flex flex-col gap-3">{children}</div>
        <div className="mt-5 flex flex-wrap gap-3">{actions}</div>
      </AlertDescription>
    </Alert>
  );
}

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type FormSurface = 'public' | 'workspace';
type FormButtonVariant = 'primary' | 'secondary';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  surface?: FormSurface;
  invalid?: boolean;
}

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  surface?: FormSurface;
  invalid?: boolean;
}

interface FormButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  surface?: FormSurface;
  variant?: FormButtonVariant;
  block?: boolean;
  pending?: boolean;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(function FormInput(
  { 'aria-invalid': ariaInvalid, className, surface = 'public', invalid, ...props },
  ref,
) {
  return (
    <Input
      ref={ref}
      className={cn(surface === 'workspace' && 'bg-card', className)}
      data-invalid={invalid || undefined}
      aria-invalid={invalid || ariaInvalid || undefined}
      {...props}
    />
  );
});

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(function FormTextarea(
  { 'aria-invalid': ariaInvalid, className, surface = 'public', invalid, ...props },
  ref,
) {
  return (
    <Textarea
      ref={ref}
      className={cn(surface === 'workspace' && 'bg-card', className)}
      data-invalid={invalid || undefined}
      aria-invalid={invalid || ariaInvalid || undefined}
      {...props}
    />
  );
});

export const FormButton = forwardRef<HTMLButtonElement, FormButtonProps>(function FormButton(
  {
    'aria-busy': ariaBusy,
    block = false,
    className,
    pending = false,
    surface = 'public',
    variant = 'primary',
    ...props
  },
  ref,
) {
  return (
    <Button
      ref={ref}
      variant={variant === 'primary' ? 'default' : 'outline'}
      className={cn(
        surface === 'workspace' && variant === 'secondary' && 'bg-card',
        block && 'w-full',
        className,
      )}
      data-pending={pending || undefined}
      aria-busy={pending || ariaBusy || undefined}
      {...props}
    >
      {pending ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
      {props.children}
    </Button>
  );
});

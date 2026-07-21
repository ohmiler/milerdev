import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import styles from './FormControls.module.css';

type FormSurface = 'public' | 'workspace';
type FormButtonVariant = 'primary' | 'secondary';

const joinClasses = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

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
    <input
      ref={ref}
      className={joinClasses(styles.control, surface === 'workspace' && styles.workspaceControl, className)}
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
    <textarea
      ref={ref}
      className={joinClasses(styles.control, styles.textarea, surface === 'workspace' && styles.workspaceControl, className)}
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
    <button
      ref={ref}
      className={joinClasses(
        styles.button,
        variant === 'primary' ? styles.primaryButton : styles.secondaryButton,
        surface === 'workspace' && styles.workspaceButton,
        block && styles.blockButton,
        className,
      )}
      data-pending={pending || undefined}
      aria-busy={pending || ariaBusy || undefined}
      {...props}
    />
  );
});

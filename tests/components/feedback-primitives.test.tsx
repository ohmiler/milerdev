import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import DialogShell from '@/components/ui/DialogShell';
import Modal from '@/components/ui/Modal';
import { FeedbackState, PendingButton } from '@/components/status/FeedbackState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { TOAST_LIFETIME_MS, toastRoleFor } from '@/components/ui/Toast';

const quote = String.fromCharCode(34);

const motionPrimitiveSources = [
  'src/components/ui/accordion.tsx',
  'src/components/ui/badge.tsx',
  'src/components/ui/dialog.tsx',
  'src/components/ui/sheet.tsx',
  'src/components/ui/switch.tsx',
  'src/components/ui/tabs.tsx',
].map((path) => readFileSync(path, 'utf8'));

describe('shared feedback primitives', () => {
  it('keeps visual skeletons out of the accessibility tree and respects reduced motion', () => {
    const html = renderToStaticMarkup(<Skeleton />);

    expect(html).toContain(`aria-hidden=${quote}true${quote}`);
    expect(html).toContain('motion-reduce:animate-none');
  });

  it('announces predictable initial loading geometry without exposing skeletons', () => {
    const html = renderToStaticMarkup(
      <FeedbackState state="loading" title="กำลังโหลดรายการ">
        <Skeleton className="h-8 w-full" />
      </FeedbackState>,
    );

    expect(html).toContain(`data-feedback-state=${quote}loading${quote}`);
    expect(html).toContain(`aria-busy=${quote}true${quote}`);
    expect(html).toContain(`role=${quote}status${quote}`);
    expect(html).toContain('กำลังโหลดรายการ');
    expect(html).toContain(`aria-hidden=${quote}true${quote}`);
  });

  it('renders an actionable empty state as a distinct polite status', () => {
    const html = renderToStaticMarkup(
      <FeedbackState
        state="empty"
        title="ยังไม่มีรายการ"
        description="เริ่มสร้างรายการแรกได้เลย"
        action={<button type="button">สร้างรายการ</button>}
      />,
    );

    expect(html).toContain(`data-feedback-state=${quote}empty${quote}`);
    expect(html).toContain(`role=${quote}status${quote}`);
    expect(html).toContain(`aria-live=${quote}polite${quote}`);
    expect(html).toContain('สร้างรายการ');
  });

  it.each(['info', 'warning', 'success', 'destructive'] as const)(
    'exposes the %s alert meaning to consumers',
    (variant) => {
      const html = renderToStaticMarkup(
        <Alert variant={variant}>
          <AlertTitle>Status</AlertTitle>
          <AlertDescription>Actionable context</AlertDescription>
        </Alert>,
      );

      expect(html).toContain(`role=${quote}alert${quote}`);
      expect(html).toContain(`data-variant=${quote}${variant}${quote}`);
      expect(html).toContain('Status');
      expect(html).toContain('Actionable context');
    },
  );

  it.each([
    ['error', 'destructive', 'alert', 'assertive'],
    ['success', 'success', 'status', 'polite'],
    ['pending', 'info', 'status', 'polite'],
    ['verifying', 'info', 'status', 'polite'],
    ['refunded', 'warning', 'status', 'polite'],
    ['disabled', 'default', 'status', 'polite'],
  ] as const)('keeps %s distinct from loading', (state, variant, role, live) => {
    const html = renderToStaticMarkup(
      <FeedbackState state={state} title="สถานะรายการ" description="รายละเอียดที่ดำเนินการต่อได้" />,
    );

    expect(html).toContain(`data-feedback-state=${quote}${state}${quote}`);
    expect(html).toContain(`data-variant=${quote}${variant}${quote}`);
    expect(html).toContain(`role=${quote}${role}${quote}`);
    expect(html).toContain(`aria-live=${quote}${live}${quote}`);
    expect(html).not.toContain(`data-feedback-state=${quote}loading${quote}`);
  });

  it('disables pending mutations while preserving the action label at rest', () => {
    const idle = renderToStaticMarkup(<PendingButton pending={false}>บันทึก</PendingButton>);
    const pending = renderToStaticMarkup(
      <PendingButton pending pendingLabel="กำลังบันทึก…">บันทึก</PendingButton>,
    );

    expect(idle).toContain('บันทึก');
    expect(idle).not.toMatch(/\sdisabled(?:=|\s|>)/);
    expect(pending).toMatch(/\sdisabled(?:=|\s|>)/);
    expect(pending).toContain(`aria-busy=${quote}true${quote}`);
    expect(pending).toContain('กำลังบันทึก…');
  });

  it('renders a named informational dialog with an explicit recovery control', () => {
    const html = renderToStaticMarkup(
      <Modal
        isOpen
        onClose={vi.fn()}
        title={'Notice'}
        type={'warning'}
        buttonText={'Acknowledge'}
      >
        Check the information again.
      </Modal>,
    );

    expect(html).toContain(`role=${quote}dialog${quote}`);
    expect(html).toContain(`aria-modal=${quote}true${quote}`);
    expect(html).toContain('aria-labelledby=');
    expect(html).toContain('aria-describedby=');
    expect(html).toContain(`data-tone=${quote}warning${quote}`);
    expect(html).toMatch(new RegExp(`<button[^>]*type=${quote}button${quote}`));
    expect(html).toContain('Acknowledge');
  });

  it('renders confirmations as destructive alert dialogs with two task controls', () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        isOpen
        title={'Delete item'}
        message={'This action cannot be undone.'}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        confirmText={'Delete item'}
        cancelText={'Cancel'}
        confirmDisabled
      />,
    );

    expect(html).toContain(`role=${quote}alertdialog${quote}`);
    expect(html).toContain(`aria-modal=${quote}true${quote}`);
    expect(html).toContain(`data-tone=${quote}error${quote}`);
    expect(html).toContain(`data-variant=${quote}destructive${quote}`);
    expect(html.match(new RegExp(`<button[^>]*type=${quote}button`, 'g'))).toHaveLength(2);
    expect(html).toContain('Cancel');
    expect(html).toContain('Delete item');
    expect(html).toContain('disabled');
  });

  it('renders no dialog surface while closed', () => {
    expect(renderToStaticMarkup(
      <Modal isOpen={false} onClose={vi.fn()}>Hidden</Modal>,
    )).toBe('');
  });

  it('keeps rich payment tasks named while separating description from interactive body content', () => {
    const html = renderToStaticMarkup(
      <DialogShell
        isOpen
        onClose={vi.fn()}
        title={'Payment method'}
        description={'Amount due 2,490 THB'}
        body={<button type={'button'}>PromptPay</button>}
        size={'wide'}
      >
        <button type={'button'}>Cancel</button>
      </DialogShell>,
    );

    expect(html).toContain(`role=${quote}dialog${quote}`);
    expect(html).toContain(`data-size=${quote}wide${quote}`);
    expect(html).toContain('aria-describedby=');
    expect(html).toContain('Amount due 2,490 THB');
    expect(html).toContain('PromptPay');
    expect(html).toContain('Cancel');
  });

  it('keeps media previews named inside the shared modal contract', () => {
    const html = renderToStaticMarkup(
      <DialogShell
        isOpen
        onClose={vi.fn()}
        title={'Course preview'}
        description={'Preview before enrolling'}
        body={<iframe title={'Preview player'} />}
        variant={'media'}
        size={'media'}
      >
        <button type={'button'}>Close preview</button>
      </DialogShell>,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('data-variant="media"');
    expect(html).toContain('data-size="media"');
    expect(html).toContain('Preview player');
    expect(html).toContain('Close preview');
  });

  it('keeps the toast timing contract and escalates errors to alerts', () => {
    expect(TOAST_LIFETIME_MS).toBe(3000);
    expect(toastRoleFor('info')).toBe('status');
    expect(toastRoleFor('success')).toBe('status');
    expect(toastRoleFor('error')).toBe('alert');
  });

  it('keeps shared interaction primitives motion-safe and free of broad transitions', () => {
    for (const source of motionPrimitiveSources) {
      expect(source).not.toContain('transition-all');
      expect(source).toContain('motion-reduce:');
    }

    const sheetSource = motionPrimitiveSources[3];
    expect(sheetSource).toContain('bg-foreground/45');
    expect(sheetSource).not.toContain('bg-slate-950/45');
    expect(sheetSource).toContain('overscroll-contain');
  });
});

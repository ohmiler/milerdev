import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import DialogShell from '@/components/ui/DialogShell';
import Modal from '@/components/ui/Modal';
import { TOAST_LIFETIME_MS, toastRoleFor } from '@/components/ui/Toast';

const quote = String.fromCharCode(34);

describe('shared feedback primitives', () => {
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
    expect(html).toContain(`<button type=${quote}button${quote}`);
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
    expect(html.match(new RegExp(`<button type=${quote}button`, 'g'))).toHaveLength(2);
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
});

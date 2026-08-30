// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import DialogShell from '@/components/ui/DialogShell';

describe('DialogShell browser behavior', () => {
  it('renders a named modal dialog and delegates close actions', async () => {
    const onClose = vi.fn();

    render(
      <DialogShell
        isOpen
        onClose={onClose}
        title={'Course preview'}
        description={'Preview before enrolling'}
      />,
    );

    const dialog = await screen.findByRole('dialog', { name: 'Course preview' });
    expect(document.body).toContain(dialog);
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
    expect(screen.getByText('Preview before enrolling')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'ปิด' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps interactive body and footer content inside the dialog', async () => {
    render(
      <DialogShell
        isOpen
        onClose={vi.fn()}
        title={'Payment method'}
        description={'Choose how to pay'}
        body={<button type={'button'}>PromptPay</button>}
      >
        <button type={'button'}>Cancel</button>
      </DialogShell>,
    );

    const dialog = await screen.findByRole('dialog', { name: 'Payment method' });
    expect(dialog.contains(screen.getByRole('button', { name: 'PromptPay' }))).toBe(true);
    expect(dialog.contains(screen.getByRole('button', { name: 'Cancel' }))).toBe(true);
  });
});

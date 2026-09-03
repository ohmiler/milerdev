// @vitest-environment jsdom

import { useRef, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DialogShell from '@/components/ui/DialogShell';

function DialogFocusHarness() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setIsOpen(true)}>Open dialog</button>
      <DialogShell
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        returnFocusRef={triggerRef}
        title="Focus contract"
        description="Focus stays inside until the dialog closes"
        body={<button type="button">Primary action</button>}
      >
        <button type="button">Secondary action</button>
      </DialogShell>
    </>
  );
}

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

  it('traps focus and returns it to the invoking control after Escape', async () => {
    const user = userEvent.setup();
    render(<DialogFocusHarness />);

    const trigger = screen.getByRole('button', { name: 'Open dialog' });
    await user.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Focus contract' });
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.tab({ shift: true });
    expect(dialog.contains(document.activeElement)).toBe(true);

    await user.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});

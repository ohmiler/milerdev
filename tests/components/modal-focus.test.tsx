// @vitest-environment jsdom

import { useRef, useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import Modal from '@/components/ui/Modal';

function ModalFocusHarness() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button ref={triggerRef} type='button' onClick={() => setIsOpen(true)}>
        Open feedback
      </button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title='Feedback'
        buttonText='Close feedback'
        returnFocusRef={triggerRef}
      >
        Payment failed
      </Modal>
    </>
  );
}

describe('Modal focus management', () => {
  afterEach(cleanup);

  it('returns focus to the supplied trigger after closing', async () => {
    const user = userEvent.setup();
    render(<ModalFocusHarness />);

    const trigger = screen.getByRole('button', { name: 'Open feedback' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Close feedback' }));

    expect(document.activeElement).toBe(trigger);
  });
});

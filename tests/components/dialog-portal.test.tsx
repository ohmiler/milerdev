import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DialogShell from '@/components/ui/DialogShell';

const { portalSpy } = vi.hoisted(() => ({
  portalSpy: vi.fn((node: ReactNode) => node),
}));

vi.mock('react-dom', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-dom')>(),
  createPortal: portalSpy,
}));

const originalDocument = globalThis.document;
const quote = String.fromCharCode(34);

afterEach(() => {
  portalSpy.mockClear();
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: originalDocument,
  });
});

describe('DialogShell portal boundary', () => {
  it('renders an open browser dialog under document.body', () => {
    const body = {};
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { body },
    });

    const html = renderToStaticMarkup(
      <DialogShell
        isOpen
        onClose={vi.fn()}
        title={'Course preview'}
        description={'Preview before enrolling'}
      />,
    );

    expect(portalSpy).toHaveBeenCalledOnce();
    expect(portalSpy).toHaveBeenCalledWith(expect.anything(), body);
    expect(html).toBe('');
  });

  it('keeps a named inline fallback when no DOM exists', () => {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: undefined,
    });

    const html = renderToStaticMarkup(
      <DialogShell
        isOpen
        onClose={vi.fn()}
        title={'Server notice'}
        description={'Rendered without a browser DOM'}
      />,
    );

    expect(portalSpy).not.toHaveBeenCalled();
    expect(html).toContain('role=' + quote + 'dialog' + quote);
    expect(html).toContain('Server notice');
  });
});

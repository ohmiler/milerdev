// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import RichTextEditor from '@/components/admin/RichTextEditor';

describe('RichTextEditor', () => {
  afterEach(() => {
    cleanup();
  });

  it('names its editable area after the visible field label', async () => {
    render(
      <>
        <span id="description-label">คำอธิบาย</span>
        <RichTextEditor labelledBy="description-label" content="<p>สวัสดี</p>" onChange={vi.fn()} />
      </>,
    );

    const editor = await screen.findByRole('textbox', { name: 'คำอธิบาย' });
    expect(editor.getAttribute('aria-multiline')).toBe('true');
  });
});

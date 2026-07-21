import { createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FormButton, FormInput, FormTextarea } from '@/components/ui/FormControls';

describe('shared form control contracts', () => {
  it('preserves native input and textarea semantics across surface variants', () => {
    const input = renderToStaticMarkup(
      <FormInput surface="workspace" name="displayName" autoComplete="name" required invalid />,
    );
    const textarea = renderToStaticMarkup(
      <FormTextarea name="message" rows={7} minLength={10} aria-describedby="message-help" />,
    );

    expect(input).toContain('name="displayName"');
    expect(input).toContain('autoComplete="name"');
    expect(input).toContain('required=""');
    expect(input).toContain('aria-invalid="true"');
    expect(textarea).toContain('name="message"');
    expect(textarea).toContain('rows="7"');
    expect(textarea).toContain('minLength="10"');
    expect(textarea).toContain('aria-describedby="message-help"');
  });

  it('exposes pending button state without changing native button behavior', () => {
    const html = renderToStaticMarkup(
      <FormButton type="submit" variant="secondary" block pending disabled>
        กำลังบันทึก
      </FormButton>,
    );

    expect(html).toContain('type="submit"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('กำลังบันทึก');
  });

  it('accepts native refs for focus management', () => {
    const inputRef = createRef<HTMLInputElement>();
    const buttonRef = createRef<HTMLButtonElement>();

    expect(() => renderToStaticMarkup(<FormInput ref={inputRef} />)).not.toThrow();
    expect(() => renderToStaticMarkup(<FormButton ref={buttonRef}>บันทึก</FormButton>)).not.toThrow();
  });
});

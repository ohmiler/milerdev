import { describe, expect, it } from 'vitest';

import { buildTypedCode, countTypedChars, HOME_EDITOR_CODE, type CodeToken } from '@/lib/home/typed-code';

const textOf = (tokens: CodeToken[]) => tokens.map((token) => token.text).join('');

describe('Home editor typing', () => {
  const total = countTypedChars(HOME_EDITOR_CODE);

  it('starts with an empty first line and the caret on it', () => {
    const view = buildTypedCode(HOME_EDITOR_CODE, 0);

    expect(view.lines).toHaveLength(1);
    expect(view.lines[0]).toMatchObject({ number: 1, tokens: [], hasCaret: true });
    expect(view).toMatchObject({ done: false, caretLine: 1, caretColumn: 1 });
  });

  it('types character by character, splitting a token where typing stopped', () => {
    const view = buildTypedCode(HOME_EDITOR_CODE, 3);

    expect(textOf(view.lines[0].tokens)).toBe('imp');
    expect(view.caretColumn).toBe(4);
  });

  it('shows a new line indented at once, the way an editor auto-indents', () => {
    const firstThreeLines = HOME_EDITOR_CODE.slice(0, 3);
    const throughLineThree = countTypedChars(firstThreeLines) + 1;
    const view = buildTypedCode(HOME_EDITOR_CODE, throughLineThree);

    expect(view.lines).toHaveLength(4);
    expect(textOf(view.lines[3].tokens)).toBe('  ');
    expect(view.lines[3].hasCaret).toBe(true);
    expect(view.lines.filter((line) => line.hasCaret)).toHaveLength(1);
  });

  it('ends with the whole program and the caret after the last brace', () => {
    const view = buildTypedCode(HOME_EDITOR_CODE, total);

    expect(view.done).toBe(true);
    expect(view.lines).toHaveLength(HOME_EDITOR_CODE.length);
    expect(view.lines.map((line) => textOf(line.tokens))).toEqual(
      HOME_EDITOR_CODE.map((line) => line.map((token) => token.text).join('')),
    );
    expect(view).toMatchObject({ caretLine: 16, caretColumn: 2 });
  });

  it('clamps out-of-range progress instead of failing', () => {
    expect(buildTypedCode(HOME_EDITOR_CODE, total + 50).done).toBe(true);
    expect(buildTypedCode(HOME_EDITOR_CODE, -5)).toMatchObject({ done: false, caretLine: 1, caretColumn: 1 });
  });
});

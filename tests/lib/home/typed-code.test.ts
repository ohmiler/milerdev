import { describe, expect, it } from 'vitest';

import {
  buildTypedCode,
  countCompletedLines,
  countTypedChars,
  HOME_EDITOR_FILES,
  lineText,
  type CodeToken,
} from '@/lib/home/typed-code';

const APP = HOME_EDITOR_FILES.app.code;
const textOf = (tokens: CodeToken[]) => tokens.map((token) => token.text).join('');

describe('Home editor typing', () => {
  const total = countTypedChars(APP);

  it('starts with an empty first line and the caret on it', () => {
    const view = buildTypedCode(APP, 0);

    expect(view.lines).toHaveLength(1);
    expect(view.lines[0]).toMatchObject({ number: 1, tokens: [], hasCaret: true });
    expect(view).toMatchObject({ done: false, caretLine: 1, caretColumn: 1 });
  });

  it('types character by character, splitting a token where typing stopped', () => {
    const view = buildTypedCode(APP, 3);

    expect(textOf(view.lines[0].tokens)).toBe('imp');
    expect(view.caretColumn).toBe(4);
  });

  it('shows a new line indented at once, the way an editor auto-indents', () => {
    const throughLineThree = countTypedChars(APP.slice(0, 3)) + 1;
    const view = buildTypedCode(APP, throughLineThree);

    expect(view.lines).toHaveLength(4);
    expect(textOf(view.lines[3].tokens)).toBe('  ');
    expect(view.lines[3].hasCaret).toBe(true);
    expect(view.lines.filter((line) => line.hasCaret)).toHaveLength(1);
  });

  it('ends with the whole file and the caret after the last brace', () => {
    const view = buildTypedCode(APP, total);

    expect(view.done).toBe(true);
    expect(view.lines.map((line) => textOf(line.tokens))).toEqual(APP.map(lineText));
    expect(view).toMatchObject({ caretLine: APP.length, caretColumn: 2 });
  });

  it('clamps out-of-range progress instead of failing', () => {
    expect(buildTypedCode(APP, total + 50).done).toBe(true);
    expect(buildTypedCode(APP, -5)).toMatchObject({ done: false, caretLine: 1, caretColumn: 1 });
  });

  it('counts a line as typed once its last character is, without waiting for the line break', () => {
    const firstLine = countTypedChars(APP.slice(0, 1));

    expect(countCompletedLines(APP, firstLine - 1)).toBe(0);
    expect(countCompletedLines(APP, firstLine)).toBe(1);
    // The blank second line is typed by its line break.
    expect(countCompletedLines(APP, firstLine + 1)).toBe(2);
    expect(countCompletedLines(APP, total)).toBe(APP.length);
  });

  it('keeps every line short enough for the editor at its narrowest', () => {
    for (const file of Object.values(HOME_EDITOR_FILES)) {
      for (const line of file.code) expect(lineText(line).length, lineText(line)).toBeLessThanOrEqual(34);
    }
  });
});

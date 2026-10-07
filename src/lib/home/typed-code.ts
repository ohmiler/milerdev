// The code the Home hero editor types out, and the pure "how much is typed so far" view of it.

export type CodeTokenKind =
  | 'keyword'
  | 'storage'
  | 'function'
  | 'string'
  | 'variable'
  | 'plain'
  | 'tag'
  | 'bracket'
  | 'attribute'
  | 'text'
  | 'number';

export interface CodeToken {
  kind: CodeTokenKind;
  text: string;
}

export interface TypedCodeLine {
  number: number;
  tokens: CodeToken[];
  hasCaret: boolean;
}

export interface TypedCodeView {
  lines: TypedCodeLine[];
  done: boolean;
  caretLine: number;
  caretColumn: number;
}

const t = (kind: CodeTokenKind, text: string): CodeToken => ({ kind, text });
const indent = (spaces: number) => t('plain', ' '.repeat(spaces));

export const HOME_EDITOR_CODE: readonly (readonly CodeToken[])[] = [
  [t('keyword', 'import'), t('plain', ' { '), t('variable', 'useState'), t('plain', ' } '), t('keyword', 'from'), t('plain', ' '), t('string', "'react'"), t('plain', ';')],
  [],
  [t('keyword', 'export'), t('plain', ' '), t('keyword', 'default'), t('plain', ' '), t('storage', 'function'), t('plain', ' '), t('function', 'App'), t('plain', '() {')],
  [indent(2), t('storage', 'const'), t('plain', ' ['), t('variable', 'lesson'), t('plain', ', '), t('function', 'setLesson'), t('plain', '] = '), t('function', 'useState'), t('plain', '('), t('number', '1'), t('plain', ');')],
  [indent(2), t('storage', 'const'), t('plain', ' '), t('function', 'next'), t('plain', ' = () '), t('storage', '=>'), t('plain', ' '), t('function', 'setLesson'), t('plain', '('), t('variable', 'lesson'), t('plain', ' + '), t('number', '1'), t('plain', ');')],
  [],
  [indent(2), t('keyword', 'return'), t('plain', ' (')],
  [indent(4), t('bracket', '<'), t('tag', 'main'), t('bracket', '>')],
  [indent(6), t('bracket', '<'), t('tag', 'h1'), t('bracket', '>'), t('text', 'Hello, World'), t('bracket', '</'), t('tag', 'h1'), t('bracket', '>')],
  [indent(6), t('bracket', '<'), t('tag', 'p'), t('bracket', '>'), t('text', 'วันนี้เรียนบทที่ '), t('plain', '{'), t('variable', 'lesson'), t('plain', '}'), t('bracket', '</'), t('tag', 'p'), t('bracket', '>')],
  [indent(6), t('bracket', '<'), t('tag', 'button'), t('plain', ' '), t('attribute', 'onClick'), t('plain', '={'), t('function', 'next'), t('plain', '}'), t('bracket', '>')],
  [indent(8), t('text', 'เรียนบทถัดไป')],
  [indent(6), t('bracket', '</'), t('tag', 'button'), t('bracket', '>')],
  [indent(4), t('bracket', '</'), t('tag', 'main'), t('bracket', '>')],
  [indent(2), t('plain', ');')],
  [t('plain', '}')],
];

// Leading indentation appears at once, the way an editor auto-indents a new line.
function isIndent(line: readonly CodeToken[], index: number): boolean {
  return index === 0 && line[0].text.trim() === '';
}

function typedLength(line: readonly CodeToken[]): number {
  return line.reduce((sum, token, index) => sum + (isIndent(line, index) ? 0 : token.text.length), 0);
}

/** Characters to type, counting one per line break and none for indentation. */
export function countTypedChars(code: readonly (readonly CodeToken[])[]): number {
  return code.reduce((sum, line) => sum + typedLength(line) + 1, 0) - 1;
}

/** The lines visible after `typed` characters, with the caret where typing stopped. */
export function buildTypedCode(code: readonly (readonly CodeToken[])[], typed: number): TypedCodeView {
  const total = countTypedChars(code);
  let left = Math.max(0, Math.min(Math.floor(typed), total));
  const lines: TypedCodeLine[] = [];

  for (let lineIndex = 0; lineIndex < code.length; lineIndex += 1) {
    const source = code[lineIndex];
    const line: TypedCodeLine = { number: lineIndex + 1, tokens: [], hasCaret: false };
    let consumed = 0;

    for (let tokenIndex = 0; tokenIndex < source.length; tokenIndex += 1) {
      const token = source[tokenIndex];
      if (isIndent(source, tokenIndex)) {
        line.tokens.push(token);
        continue;
      }
      if (left <= 0) break;
      const take = Math.min(left, token.text.length);
      line.tokens.push({ kind: token.kind, text: token.text.slice(0, take) });
      left -= take;
      consumed += take;
    }

    lines.push(line);
    if (consumed < typedLength(source) || left === 0) {
      line.hasCaret = true;
      break;
    }
    left -= 1;
  }

  const caretLine = lines[lines.length - 1];
  return {
    lines,
    done: Math.min(Math.floor(typed), total) >= total,
    caretLine: caretLine.number,
    caretColumn: caretLine.tokens.reduce((sum, token) => sum + token.text.length, 0) + 1,
  };
}

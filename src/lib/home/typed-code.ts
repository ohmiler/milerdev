// The files the Home hero editor types out, and the pure "how much is typed so far" view of them.

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
  | 'number'
  | 'selector'
  | 'property'
  | 'value';

export interface CodeToken {
  kind: CodeTokenKind;
  text: string;
}

export type CodeLines = readonly (readonly CodeToken[])[];

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
const attr = (name: string, value: string) => [t('plain', ' '), t('attribute', name), t('plain', '='), t('string', `"${value}"`)];
const open = (tag: string, ...rest: CodeToken[]) => [t('bracket', '<'), t('tag', tag), ...rest, t('bracket', '>')];
const close = (tag: string) => [t('bracket', '</'), t('tag', tag), t('bracket', '>')];
const declaration = (property: string, value: string, kind: CodeTokenKind = 'value') => [
  indent(2), t('property', property), t('plain', ': '), t(kind, value), t('plain', ';'),
];

// A developer's portfolio card: App.jsx builds it, index.css styles it. The preview renders what is typed so far.
const APP_CODE: CodeLines = [
  [t('keyword', 'import'), t('plain', ' '), t('string', "'./index.css'"), t('plain', ';')],
  [],
  [t('keyword', 'export'), t('plain', ' '), t('keyword', 'default'), t('plain', ' '), t('storage', 'function'), t('plain', ' '), t('function', 'App'), t('plain', '() {')],
  [indent(2), t('keyword', 'return'), t('plain', ' (')],
  [indent(4), ...open('main', ...attr('className', 'card'))],
  [indent(6), t('bracket', '<'), t('tag', 'img'), ...attr('src', 'me.png'), ...attr('alt', ''), t('plain', ' '), t('bracket', '/>')],
  [indent(6), ...open('h1'), t('text', 'Miler'), ...close('h1')],
  [indent(6), ...open('p'), t('text', 'Frontend Developer'), ...close('p')],
  [indent(6), ...open('ul', ...attr('className', 'skills'))],
  [indent(8), ...open('li'), t('text', 'React'), ...close('li')],
  [indent(8), ...open('li'), t('text', 'CSS'), ...close('li')],
  [indent(8), ...open('li'), t('text', 'AI'), ...close('li')],
  [indent(6), ...close('ul')],
  [indent(6), ...open('button'), t('text', 'ดูผลงาน'), ...close('button')],
  [indent(4), ...close('main')],
  [indent(2), t('plain', ');')],
  [t('plain', '}')],
];

const CSS_CODE: CodeLines = [
  [t('selector', '.card'), t('plain', ' {')],
  declaration('padding', '20px', 'number'),
  declaration('border', '1px solid #e5e5e5'),
  declaration('border-radius', '12px', 'number'),
  [t('plain', '}')],
  [t('selector', 'img'), t('plain', ' { '), t('property', 'border-radius'), t('plain', ': '), t('number', '50%'), t('plain', '; }')],
  [t('selector', 'p'), t('plain', ' { '), t('property', 'color'), t('plain', ': '), t('value', '#737373'), t('plain', '; }')],
  [t('selector', '.skills'), t('plain', ' {')],
  declaration('display', 'flex'),
  declaration('gap', '12px', 'number'),
  declaration('list-style', 'none'),
  [t('plain', '}')],
  [t('selector', 'button'), t('plain', ' {')],
  declaration('background', '#171717'),
  declaration('color', '#fff'),
  declaration('border-radius', '8px', 'number'),
  [t('plain', '}')],
];

export type HomeEditorFileId = 'app' | 'css';

export const HOME_EDITOR_FILE_IDS: readonly HomeEditorFileId[] = ['app', 'css'];

export const HOME_EDITOR_FILES: Record<HomeEditorFileId, { name: string; language: string; code: CodeLines }> = {
  app: { name: 'App.jsx', language: 'JSX', code: APP_CODE },
  css: { name: 'index.css', language: 'CSS', code: CSS_CODE },
};

export const lineText = (line: readonly CodeToken[]) => line.map((token) => token.text).join('');

// Leading indentation appears at once, the way an editor auto-indents a new line.
function isIndent(line: readonly CodeToken[], index: number): boolean {
  return index === 0 && line[0].text.trim() === '';
}

function typedLength(line: readonly CodeToken[]): number {
  return line.reduce((sum, token, index) => sum + (isIndent(line, index) ? 0 : token.text.length), 0);
}

/** Characters to type, counting one per line break and none for indentation. */
export function countTypedChars(code: CodeLines): number {
  return code.reduce((sum, line) => sum + typedLength(line) + 1, 0) - 1;
}

/** How many lines are typed in full after `typed` characters. */
export function countCompletedLines(code: CodeLines, typed: number): number {
  let left = Math.max(0, Math.floor(typed));
  let completed = 0;
  for (const line of code) {
    const length = typedLength(line);
    if (left < length) break;
    left -= length;
    completed += 1;
    if (left === 0) break;
    left -= 1;
  }
  return completed;
}

/** The lines visible after `typed` characters, with the caret where typing stopped. */
export function buildTypedCode(code: CodeLines, typed: number): TypedCodeView {
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

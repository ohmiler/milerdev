// Keystroke handling for a masked password prompt: each typed or pasted character echoes as
// "*", so the person can see how much they typed without the password appearing on screen.

export type MaskedInputState = { value: string; done: boolean; cancelled: boolean };

export const initialMaskedInput: MaskedInputState = { value: '', done: false, cancelled: false };

const ESCAPE = '\u001b';

/** Applies one chunk of raw terminal input and returns the new state plus what to echo. */
export function applyMaskedInput(state: MaskedInputState, chunk: string): { state: MaskedInputState; echo: string } {
  const chars = [...chunk];
  let value = [...state.value];
  let echo = '';
  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index];
    if (char === '\r' || char === '\n') return { state: { value: value.join(''), done: true, cancelled: false }, echo };
    if (char === '\u0003') return { state: { value: '', done: true, cancelled: true }, echo };
    if (char === '\u007f' || char === '\b') {
      if (value.length > 0) {
        value = value.slice(0, -1);
        echo += '\b \b';
      }
      continue;
    }
    if (char === ESCAPE) {
      // Skip a whole escape sequence such as an arrow key: ESC [ ... final letter or "~".
      if (chars[index + 1] === '[' || chars[index + 1] === 'O') {
        index += 2;
        while (index < chars.length && !/[A-Za-z~]/.test(chars[index])) index += 1;
      }
      continue;
    }
    if (char < ' ') continue;
    value.push(char);
    echo += '*';
  }
  return { state: { value: value.join(''), done: false, cancelled: false }, echo };
}

/** True when the password has characters outside printable ASCII, such as Thai letters. */
export function hasNonAsciiCharacters(password: string): boolean {
  return /[^\x20-\x7E]/.test(password);
}

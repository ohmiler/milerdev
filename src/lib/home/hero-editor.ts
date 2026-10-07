// The Home hero editor's loop: type App.jsx, switch to index.css and type it, hold the finished page,
// then start again. Pure functions of a tick count so the loop and the preview are testable.

import {
  countCompletedLines,
  countTypedChars,
  HOME_EDITOR_FILES,
  lineText,
  type CodeLines,
  type HomeEditorFileId,
} from '@/lib/home/typed-code';

export const EDITOR_TICK_MS = 45;
const CHARS_PER_TICK = 3;
// About a second on the finished App.jsx before switching tabs, and five on the finished page.
const HOLD_AFTER_APP_TICKS = 25;
const HOLD_AFTER_CSS_TICKS = 110;

const APP_CHARS = countTypedChars(HOME_EDITOR_FILES.app.code);
const CSS_CHARS = countTypedChars(HOME_EDITOR_FILES.css.code);
const CSS_STARTS_AT = Math.ceil(APP_CHARS / CHARS_PER_TICK) + HOLD_AFTER_APP_TICKS;

export const EDITOR_CYCLE_TICKS = CSS_STARTS_AT + Math.ceil(CSS_CHARS / CHARS_PER_TICK) + HOLD_AFTER_CSS_TICKS;

export type TypedProgress = Record<HomeEditorFileId, number>;

export interface HeroEditorFrame {
  file: HomeEditorFileId;
  typed: TypedProgress;
}

/** Both files typed in full: the page as it looks when the loop is stopped. */
export const FINISHED_PROGRESS: TypedProgress = { app: APP_CHARS, css: CSS_CHARS };

export function heroEditorFrame(tick: number): HeroEditorFrame {
  const step = ((Math.floor(tick) % EDITOR_CYCLE_TICKS) + EDITOR_CYCLE_TICKS) % EDITOR_CYCLE_TICKS;
  if (step < CSS_STARTS_AT) {
    return { file: 'app', typed: { app: Math.min(APP_CHARS, step * CHARS_PER_TICK), css: 0 } };
  }
  return { file: 'css', typed: { app: APP_CHARS, css: Math.min(CSS_CHARS, (step - CSS_STARTS_AT) * CHARS_PER_TICK) } };
}

// The 1-based line that holds a snippet, so the preview follows the code if a line moves.
function lineOf(code: CodeLines, snippet: string): number {
  const index = code.findIndex((line) => lineText(line).includes(snippet));
  if (index < 0) throw new Error(`Home editor code has no line with ${snippet}`);
  return index + 1;
}

const APP = HOME_EDITOR_FILES.app.code;
const CSS = HOME_EDITOR_FILES.css.code;
const REVEAL = {
  brand: lineOf(APP, '<b>'),
  menu: lineOf(APP, '<a '),
  heading: lineOf(APP, '<h1>'),
  text: lineOf(APP, '<p>'),
  button: lineOf(APP, '<button>'),
  navFlex: lineOf(CSS, 'display: flex'),
  navSpaced: lineOf(CSS, 'justify-content'),
  heroPadding: lineOf(CSS, 'padding'),
  heroRounded: lineOf(CSS, 'border-radius: 16px'),
  // Background and text colour land together, so dark text never sits on the brown fill.
  heroColors: lineOf(CSS, 'color: #fff'),
  buttonFill: lineOf(CSS, 'background: #ffd28a'),
  buttonRounded: lineOf(CSS, 'border-radius: 999px'),
};

export type HeroPreviewState = Record<keyof typeof REVEAL, boolean>;

/** What the mock page shows: an element once its line is typed, a style once its declaration is. */
export function heroPreviewState(typed: TypedProgress): HeroPreviewState {
  const app = countCompletedLines(APP, typed.app);
  const css = countCompletedLines(CSS, typed.css);
  const appKeys = ['brand', 'menu', 'heading', 'text', 'button'] as const;
  return Object.fromEntries(
    (Object.keys(REVEAL) as (keyof typeof REVEAL)[]).map((key) => [
      key,
      (appKeys as readonly string[]).includes(key) ? app >= REVEAL[key] : css >= REVEAL[key],
    ]),
  ) as HeroPreviewState;
}

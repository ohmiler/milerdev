import { describe, expect, it } from 'vitest';

import { EDITOR_CYCLE_TICKS, FINISHED_PROGRESS, heroEditorFrame, heroPreviewState } from '@/lib/home/hero-editor';

const firstTick = (predicate: (tick: number) => boolean) => {
  for (let tick = 0; tick < EDITOR_CYCLE_TICKS; tick += 1) if (predicate(tick)) return tick;
  throw new Error('never happens in one loop');
};

describe('Home hero editor loop', () => {
  it('types App.jsx first, then switches to index.css once App.jsx is finished', () => {
    expect(heroEditorFrame(0)).toEqual({ file: 'app', typed: { app: 0, css: 0 } });

    const switchTick = firstTick((tick) => heroEditorFrame(tick).file === 'css');
    expect(heroEditorFrame(switchTick - 1).typed.app).toBe(FINISHED_PROGRESS.app);
    expect(heroEditorFrame(switchTick).typed).toEqual({ app: FINISHED_PROGRESS.app, css: 0 });
  });

  it('holds the finished page, then starts the loop again', () => {
    expect(heroEditorFrame(EDITOR_CYCLE_TICKS - 1)).toEqual({ file: 'css', typed: FINISHED_PROGRESS });
    expect(heroEditorFrame(EDITOR_CYCLE_TICKS)).toEqual(heroEditorFrame(0));
    expect(heroEditorFrame(EDITOR_CYCLE_TICKS * 3 + 5)).toEqual(heroEditorFrame(5));
  });
});

describe('Home hero preview', () => {
  it('starts as an empty page', () => {
    expect(Object.values(heroPreviewState({ app: 0, css: 0 })).some(Boolean)).toBe(false);
  });

  it('shows each element once its line is typed, unstyled until the CSS is', () => {
    const halfway = heroEditorFrame(firstTick((tick) => heroPreviewState(heroEditorFrame(tick).typed).avatar));
    const state = heroPreviewState(halfway.typed);

    expect(state).toMatchObject({ avatar: true, button: false, cardBorder: false, avatarRound: false });
    expect(heroPreviewState({ app: FINISHED_PROGRESS.app, css: 0 })).toMatchObject({
      avatar: true, name: true, role: true, react: true, css: true, ai: true, button: true, cardPadding: false, skillsRow: false,
    });
  });

  it('applies the styles in the order they are typed, ending with every one applied', () => {
    const order = ['cardPadding', 'cardBorder', 'cardRounded', 'avatarRound', 'roleMuted', 'skillsRow', 'skillsGap', 'skillsBare', 'buttonColors', 'buttonRounded'] as const;
    const appliedAt = order.map((key) => firstTick((tick) => heroPreviewState(heroEditorFrame(tick).typed)[key]));

    expect(appliedAt).toEqual([...appliedAt].sort((left, right) => left - right));
    expect(Object.values(heroPreviewState(FINISHED_PROGRESS)).every(Boolean)).toBe(true);
  });
});

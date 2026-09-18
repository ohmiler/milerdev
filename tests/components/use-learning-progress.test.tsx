// @vitest-environment jsdom

import { StrictMode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLearningProgress } from '@/components/course/use-learning-progress';
import { showToast } from '@/components/ui/Toast';

vi.mock('@/components/ui/Toast', () => ({ showToast: vi.fn() }));

function input(lessonId = 'lesson-1') {
  return {
    courseId: 'course-1', lessonId, isEnrolled: true, canTrackProgress: true,
    completedLessonIds: [] as string[], totalLessons: 2,
    currentProgress: { completed: false, watchTimeSeconds: 10 },
  };
}

function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => { resolve = done; });
  return { promise, resolve };
}

function writes() {
  return vi.mocked(fetch).mock.calls.map(([, options]) => JSON.parse(options?.body as string));
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
  vi.mocked(showToast).mockClear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('learning progress session lifecycle', () => {
  it.each([200, 503])('isolates late completion (%s) from the next lesson and its in-flight completion', async (status) => {
    const oldWrite = deferredResponse();
    const newWrite = deferredResponse();
    vi.mocked(fetch).mockReturnValueOnce(oldWrite.promise).mockReturnValueOnce(newWrite.promise);
    const { result, rerender } = renderHook(useLearningProgress, { initialProps: input() });
    act(() => { void result.current.completeCurrentLesson(); });
    expect(result.current.completionSaveState).toBe('pending');

    rerender(input('lesson-2'));
    expect(result.current.completionSaveState).toBe('idle');
    act(() => { void result.current.completeCurrentLesson(); });
    await act(async () => { oldWrite.resolve(new Response(null, { status })); });
    expect(result.current.completionSaveState).toBe('pending');
    expect(result.current.completedIds.size).toBe(0);
    expect(showToast).not.toHaveBeenCalled();

    await act(async () => { newWrite.resolve(new Response(null, { status: 200 })); });
    expect(result.current.completedIds).toEqual(new Set(['lesson-2']));
    expect(result.current.completionSaveState).toBe('saved');
    expect(writes()).toEqual([
      { lessonId: 'lesson-1', watchTimeSeconds: 10, completed: true },
      { lessonId: 'lesson-2', watchTimeSeconds: 10, completed: true },
    ]);
  });

  it('ignores an old watch failure and callbacks after a lesson change', async () => {
    const oldWrite = deferredResponse();
    vi.mocked(fetch).mockReturnValueOnce(oldWrite.promise);
    const { result, rerender } = renderHook(useLearningProgress, { initialProps: input() });
    const oldPlayer = result.current.player;
    act(() => { oldPlayer.onTimeUpdate(42); oldPlayer.onPause(); });
    rerender(input('lesson-2'));
    await act(async () => { oldWrite.resolve(new Response(null, { status: 503 })); });
    act(() => { oldPlayer.onTimeUpdate(90); oldPlayer.onEnded(); oldPlayer.onResume(42); });
    expect(result.current.watchSyncFailed).toBe(false);
    expect(result.current.resumedAtSeconds).toBeNull();
    await act(async () => {
      result.current.player.onTimeUpdate(20);
      await result.current.syncWatchTime();
    });
    expect(writes()).toEqual([
      { lessonId: 'lesson-1', watchTimeSeconds: 42 },
      { lessonId: 'lesson-2', watchTimeSeconds: 20 },
    ]);
  });

  it('does not let a response from a previous visit complete a new visit to the same lesson', async () => {
    const oldWrite = deferredResponse();
    vi.mocked(fetch).mockReturnValueOnce(oldWrite.promise);
    const { result, rerender } = renderHook(useLearningProgress, { initialProps: input() });
    act(() => { void result.current.completeCurrentLesson(); });
    rerender(input('lesson-2'));
    rerender(input());
    await act(async () => { oldWrite.resolve(new Response(null, { status: 200 })); });
    expect(result.current.completionSaveState).toBe('idle');
    expect(result.current.completedIds.size).toBe(0);
    expect(showToast).not.toHaveBeenCalled();
  });

  it('keeps pending writes through equivalent projection rerenders', async () => {
    const pending = deferredResponse();
    vi.mocked(fetch).mockReturnValueOnce(pending.promise);
    const { result, rerender } = renderHook(useLearningProgress, { initialProps: input() });
    act(() => { result.current.player.onEnded(); });
    rerender(input());
    act(() => { result.current.player.onEnded(); });
    expect(fetch).toHaveBeenCalledOnce();
    expect(result.current.completionSaveState).toBe('pending');
    await act(async () => { pending.resolve(new Response(null, { status: 200 })); });
    expect(result.current.completionSaveState).toBe('saved');
  });

  it('syncs only while playing and flushes on disposal with no remaining timer', async () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useLearningProgress(input()), {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>,
    });
    act(() => { result.current.player.onTimeUpdate(20); });
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(fetch).not.toHaveBeenCalled();
    act(() => { result.current.player.onPlay(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(writes()).toEqual([{ lessonId: 'lesson-1', watchTimeSeconds: 20 }]);
    act(() => { result.current.player.onTimeUpdate(42); });
    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(writes()).toHaveLength(2);
    expect(writes()[1]).toEqual({ lessonId: 'lesson-1', watchTimeSeconds: 42 });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('flushes the latest old-lesson position after its pending write finishes on disposal', async () => {
    const pending = deferredResponse();
    vi.mocked(fetch).mockReturnValueOnce(pending.promise);
    const { result, rerender } = renderHook(useLearningProgress, { initialProps: input() });
    act(() => { result.current.player.onTimeUpdate(20); result.current.player.onPause(); });
    act(() => { result.current.player.onTimeUpdate(42); });
    rerender(input('lesson-2'));
    await act(async () => { pending.resolve(new Response(null, { status: 200 })); });
    expect(writes()).toEqual([
      { lessonId: 'lesson-1', watchTimeSeconds: 20 },
      { lessonId: 'lesson-1', watchTimeSeconds: 42 },
    ]);
    expect(result.current.watchSyncFailed).toBe(false);
  });

  it('does not write anonymous progress, including on disposal', async () => {
    const { result, unmount } = renderHook(() => useLearningProgress({ ...input(), canTrackProgress: false, isEnrolled: false }));
    await act(async () => {
      result.current.player.onTimeUpdate(42);
      result.current.player.onPlay();
      result.current.player.onPause();
      result.current.player.onEnded();
      await result.current.completeCurrentLesson();
    });
    unmount();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('allows signed-in preview watch positions but never marks the preview completed', async () => {
    const { result } = renderHook(() => useLearningProgress({ ...input(), isEnrolled: false }));
    await act(async () => {
      result.current.player.onTimeUpdate(42);
      result.current.player.onPause();
      result.current.player.onEnded();
      await result.current.completeCurrentLesson();
    });
    expect(writes()).toEqual([{ lessonId: 'lesson-1', watchTimeSeconds: 42 }]);
    expect(result.current.completionSaveState).toBe('idle');
  });

  it('keeps watch acknowledgements monotonic when completion finishes before an older watch write', async () => {
    const watch = deferredResponse();
    vi.mocked(fetch).mockReturnValueOnce(watch.promise);
    const { result } = renderHook(() => useLearningProgress(input()));
    act(() => { result.current.player.onTimeUpdate(20); result.current.player.onPause(); });
    await act(async () => {
      result.current.player.onTimeUpdate(42);
      await result.current.completeCurrentLesson();
    });
    await act(async () => { watch.resolve(new Response(null, { status: 200 })); });
    await act(async () => { await result.current.syncWatchTime(); });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.current.completionSaveState).toBe('saved');
  });
});

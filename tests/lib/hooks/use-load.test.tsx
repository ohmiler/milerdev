// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { loadErrorMessage, useLoad } from '@/lib/hooks/use-load';

function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('useLoad', () => {
  it('is loading from the first render until the load for the key settles', async () => {
    const pending = deferred();
    const load = vi.fn(() => pending.promise);
    const { result } = renderHook(() => useLoad('/api/items', load));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    await act(async () => pending.resolve());
    expect(result.current).toMatchObject({ loading: false, error: null });
  });

  it('loads again and is loading while a changed key is fetched', async () => {
    const loads = [deferred(), deferred()];
    const load = vi.fn(() => loads[load.mock.calls.length - 1].promise);
    const { result, rerender } = renderHook(({ url }) => useLoad(url, load), { initialProps: { url: '/api/items?page=1' } });
    await act(async () => loads[0].resolve());
    expect(result.current.loading).toBe(false);

    rerender({ url: '/api/items?page=2' });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    await act(async () => loads[1].resolve());
    expect(result.current.loading).toBe(false);
  });

  it('aborts a load that a newer key replaced and ignores how it ends', async () => {
    const first = deferred();
    const second = deferred();
    const signals: AbortSignal[] = [];
    const load = vi.fn((signal: AbortSignal) => {
      signals.push(signal);
      return signals.length === 1 ? first.promise : second.promise;
    });
    const { result, rerender } = renderHook(({ url }) => useLoad(url, load), { initialProps: { url: '/api/a' } });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    rerender({ url: '/api/b' });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(signals[0].aborted).toBe(true);

    await act(async () => first.reject(new Error('aborted')));
    expect(result.current).toMatchObject({ loading: true, error: null });

    await act(async () => second.resolve());
    expect(result.current).toMatchObject({ loading: false, error: null });
  });

  it('reports what a failed load threw and clears it while the next load runs', async () => {
    const loads = [deferred(), deferred()];
    const load = vi.fn(() => loads[load.mock.calls.length - 1].promise);
    const { result } = renderHook(() => useLoad('/api/items', load));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    const failure = new Error('ไม่สามารถโหลดได้');
    await act(async () => loads[0].reject(failure));
    expect(result.current).toMatchObject({ loading: false, error: failure });

    let reloaded!: Promise<void>;
    act(() => {
      reloaded = result.current.reload();
    });
    expect(result.current).toMatchObject({ loading: true, error: null });

    await act(async () => {
      loads[1].resolve();
      await reloaded;
    });
    expect(load).toHaveBeenCalledTimes(2);
    expect(result.current).toMatchObject({ loading: false, error: null });
  });

  it('fetches the same key again on reload and resolves once that load settles', async () => {
    const loads = [deferred(), deferred()];
    const load = vi.fn(() => loads[load.mock.calls.length - 1].promise);
    const { result } = renderHook(() => useLoad('/api/items', load));
    await act(async () => loads[0].resolve());

    let settled = false;
    act(() => {
      void result.current.reload().then(() => {
        settled = true;
      });
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(settled).toBe(false);
    expect(result.current.loading).toBe(true);

    await act(async () => loads[1].resolve());
    await waitFor(() => expect(settled).toBe(true));
    expect(result.current.loading).toBe(false);
  });

  it('is loading again when the key returns to one that settled before', async () => {
    const loads = [deferred(), deferred()];
    const load = vi.fn(() => loads[load.mock.calls.length - 1].promise);
    const { result, rerender } = renderHook(({ url }: { url: string | null }) => useLoad(url, load), {
      initialProps: { url: '/api/cases/a' as string | null },
    });
    await act(async () => loads[0].resolve());
    expect(result.current.loading).toBe(false);

    rerender({ url: null });
    expect(result.current.loading).toBe(false);
    rerender({ url: '/api/cases/a' });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    await act(async () => loads[1].resolve());
    expect(result.current.loading).toBe(false);
  });

  it('loads nothing for a null key', async () => {
    const load = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() => useLoad(null, load));

    expect(result.current).toMatchObject({ loading: false, error: null });
    await act(async () => result.current.reload());
    expect(load).not.toHaveBeenCalled();
  });
});

describe('loadErrorMessage', () => {
  it('shows a thrown message, falls back for anything else, and is empty without an error', () => {
    expect(loadErrorMessage(new Error('โหลดไม่สำเร็จ'), 'fallback')).toBe('โหลดไม่สำเร็จ');
    expect(loadErrorMessage('load failed', 'fallback')).toBe('fallback');
    expect(loadErrorMessage(null, 'fallback')).toBe('');
  });
});

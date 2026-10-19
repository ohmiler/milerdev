import { useEffect, useEffectEvent, useRef, useState } from 'react';

type Settled = { request: string; error: unknown };

/**
 * Runs `load` after render whenever `key` changes, and again on `reload()`.
 *
 * Use the request URL, or anything that changes when the data should be fetched again, as `key`;
 * `null` loads nothing. `load` stores what it fetched itself and throws to report a failure.
 *
 * `loading` is derived rather than set when a load starts: it stays true until the load for the
 * current key settles, so the effect never sets state before its first await. `error` is what
 * the current load threw (null when it succeeded) and is cleared while a newer load runs. A load
 * that a newer key or reload replaced is aborted, and its result is ignored.
 */
export function useLoad(key: string | null, load: (signal: AbortSignal) => Promise<void>) {
  const [version, setVersion] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);
  const [currentKey, setCurrentKey] = useState(key);
  const reloadWaiters = useRef<Array<() => void>>([]);
  const runLoad = useEffectEvent(load);
  const request = key === null ? null : `${version}:${key}`;

  // A new key starts over, even when it returns to a key that settled before (A, then B, then A).
  if (currentKey !== key) {
    setCurrentKey(key);
    setSettled(null);
  }

  useEffect(() => {
    const releaseReloads = () => {
      for (const resolve of reloadWaiters.current.splice(0)) resolve();
    };
    if (request === null) {
      releaseReloads();
      return;
    }
    const controller = new AbortController();
    runLoad(controller.signal).then(
      () => null,
      // A failure is never null, even when something other than an Error was thrown.
      (error: unknown) => error ?? 'load failed',
    ).then((error) => {
      if (controller.signal.aborted) return;
      setSettled({ request, error });
      releaseReloads();
    });
    return () => controller.abort();
  }, [request]);

  // Fetches the current key again, for example after a mutation. Awaiting it waits for that load.
  const reload = () => new Promise<void>((resolve) => {
    if (key === null) {
      resolve();
      return;
    }
    reloadWaiters.current.push(resolve);
    setVersion((current) => current + 1);
  });

  const loading = request !== null && settled?.request !== request;
  const error = !loading && settled?.request === request ? settled.error : null;
  return { loading, error, reload };
}

// What to show for a `useLoad` error: the thrown Error's message, or `fallback`. Empty when there is none.
export function loadErrorMessage(error: unknown, fallback: string) {
  if (error === null) return '';
  return error instanceof Error ? error.message : fallback;
}

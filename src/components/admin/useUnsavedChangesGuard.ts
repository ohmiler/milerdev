'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Warns before leaving a page that holds unsaved input.
 *
 * - Reload, tab close and typed addresses use the browser's own prompt (`beforeunload`).
 * - Clicks on in-app links are held back so the page can ask first; `leave` then navigates.
 * - The browser Back and Forward buttons are not intercepted: the App Router has no reliable hook for them.
 */
export function useUnsavedChangesGuard(dirty: boolean, navigate: (href: string) => void) {
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement) || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return;

      const url = new URL(anchor.href, window.location.href);
      // Other origins unload the page, so beforeunload already covers them.
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingHref(url.pathname + url.search + url.hash);
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    // Capture phase so the click is stopped before the router's own link handler runs.
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty]);

  const stay = useCallback(() => setPendingHref(null), []);
  const leave = useCallback(() => {
    if (pendingHref) navigate(pendingHref);
    setPendingHref(null);
  }, [navigate, pendingHref]);

  return { pendingHref, stay, leave };
}

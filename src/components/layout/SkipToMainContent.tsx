'use client';

import type { MouseEvent } from 'react';

export const MAIN_CONTENT_ID = 'main-content';

export default function SkipToMainContent() {
  const focusMainContent = (event: MouseEvent<HTMLAnchorElement>) => {
    const mainContent = document.getElementById(MAIN_CONTENT_ID);
    if (!mainContent) return;
    event.preventDefault();
    mainContent.focus();
  };

  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      onClick={focusMainContent}
      className="sr-only fixed left-4 top-4 z-[60] rounded-lg bg-background px-4 py-2 font-semibold text-foreground shadow-lg outline-none focus:not-sr-only focus:ring-4 focus:ring-ring/30"
    >
      ข้ามไปเนื้อหาหลัก
    </a>
  );
}

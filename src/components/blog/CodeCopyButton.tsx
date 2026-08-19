'use client';

import { useEffect } from 'react';

const copyIcon = `<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='9' y='9' width='13' height='13' rx='2'/><path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'/></svg>`;
const successIcon = `<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='20 6 9 17 4 12'/></svg>`;

export default function CodeCopyButton({ selector = '.rich-content pre' }: { selector?: string } = {}) {
  useEffect(() => {
    const blocks = document.querySelectorAll<HTMLPreElement>(selector);

    blocks.forEach((pre) => {
      if (pre.querySelector('[data-code-copy]')) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'absolute right-3 top-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-black/40 px-2.5 text-xs font-medium text-white backdrop-blur hover:bg-black/60 data-[copied=true]:border-emerald-400/40 data-[copied=true]:text-emerald-300';
      button.dataset.codeCopy = 'true';
      button.setAttribute('aria-label', 'คัดลอกโค้ด');
      button.innerHTML = `${copyIcon}คัดลอก`;

      button.addEventListener('click', async () => {
        const code = pre.querySelector('code')?.innerText ?? '';
        try {
          await navigator.clipboard.writeText(code);
          button.innerHTML = `${successIcon}คัดลอกแล้ว`;
          button.dataset.copied = 'true';
          setTimeout(() => {
            button.innerHTML = `${copyIcon}คัดลอก`;
            delete button.dataset.copied;
          }, 2000);
        } catch {
          button.textContent = 'Error';
        }
      });

      pre.style.position = 'relative';
      pre.appendChild(button);
    });
  }, [selector]);

  return null;
}

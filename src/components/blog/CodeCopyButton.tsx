'use client';

import { useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

function CodeCopyAction({ pre }: { pre: HTMLPreElement }) {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
  }, []);

  const handleCopy = async () => {
    const code = pre.querySelector('code')?.innerText ?? '';

    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="xs"
      onClick={handleCopy}
      aria-label={copied ? 'คัดลอกโค้ดแล้ว' : 'คัดลอกโค้ด'}
      aria-live="polite"
    >
      {copied ? (
        <Check data-icon="inline-start" aria-hidden="true" />
      ) : (
        <Copy data-icon="inline-start" aria-hidden="true" />
      )}
      {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
    </Button>
  );
}

export default function CodeCopyButton({ selector = '.rich-content pre' }: { selector?: string } = {}) {
  useEffect(() => {
    const created: Array<{
      pre: HTMLPreElement;
      container: HTMLSpanElement;
      root: Root;
      addedRelativeClass: boolean;
    }> = [];
    const blocks = document.querySelectorAll<HTMLPreElement>(selector);

    blocks.forEach((pre) => {
      if (pre.querySelector('[data-code-copy]')) return;

      const container = document.createElement('span');
      const addedRelativeClass = !pre.classList.contains('relative');
      if (addedRelativeClass) pre.classList.add('relative');
      container.dataset.codeCopy = 'true';
      container.className = 'absolute top-3 right-3';
      pre.appendChild(container);
      const root = createRoot(container);
      root.render(<CodeCopyAction pre={pre} />);
      created.push({ pre, container, root, addedRelativeClass });
    });

    return () => {
      created.forEach(({ pre, container, root, addedRelativeClass }) => {
        root.unmount();
        container.remove();
        if (addedRelativeClass) pre.classList.remove('relative');
      });
    };
  }, [selector]);

  return null;
}

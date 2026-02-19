'use client';

import { useEffect, useState, useMemo } from 'react';

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

interface Props {
  contentHtml: string;
}

export default function TableOfContents({ contentHtml }: Props) {
  const [activeId, setActiveId] = useState<string>('');
  const [open, setOpen] = useState(true);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const items = useMemo<TocItem[]>(() => {
    const parsed: TocItem[] = [];
    const regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
    let match;
    let i = 0;
    while ((match = regex.exec(contentHtml)) !== null) {
      const rawText = match[1].replace(/<[^>]+>/g, '').trim();
      if (!rawText) continue;
      const id = `toc-${i}-${rawText.toLowerCase().replace(/[^a-z0-9ก-๙]+/g, '-').replace(/^-|-$/g, '')}`;
      parsed.push({ id, text: rawText, level: 2 });
      i++;
    }
    return parsed;
  }, [contentHtml]);

  useEffect(() => {
    if (items.length === 0) return;

    const realHeadings = document.querySelectorAll<HTMLElement>('.rich-content h2');
    realHeadings.forEach((h, i) => {
      if (items[i]) h.id = items[i].id;
    });

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    realHeadings.forEach(h => observer.observe(h));
    return () => observer.disconnect();
  }, [items]);

  if (isMobile === null || isMobile || items.length < 2) return null;

  return (
    <div style={{
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      overflow: 'hidden',
      fontSize: '0.875rem',
      maxHeight: 'calc(100vh - 120px)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          background: '#f8fafc',
          border: 'none',
          borderBottom: open ? '1px solid #e2e8f0' : 'none',
          cursor: 'pointer',
          width: '100%',
          fontWeight: 600,
          color: '#1e293b',
          fontSize: '0.875rem',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" />
          </svg>
          สารบัญ
        </span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Items */}
      {open && (
        <nav style={{ overflowY: 'auto', padding: '8px 0' }}>
          {items.map(item => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              style={{
                display: 'block',
                padding: item.level === 2 ? '6px 16px' : '5px 16px 5px 28px',
                color: activeId === item.id ? '#2563eb' : '#475569',
                textDecoration: 'none',
                fontSize: item.level === 2 ? '0.8125rem' : '0.775rem',
                fontWeight: activeId === item.id ? 600 : 400,
                borderLeft: activeId === item.id ? '2px solid #2563eb' : '2px solid transparent',
                transition: 'all 0.15s',
                lineHeight: 1.4,
              }}
            >
              {item.text}
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}

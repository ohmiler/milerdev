'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
}

const typeStyles: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  info: { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', icon: 'ℹ️' },
  warning: { bg: '#fffbeb', border: '#fde68a', color: '#92400e', icon: '⚠️' },
  success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534', icon: '✅' },
  error: { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', icon: '🚨' },
};

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();

    // Load dismissed IDs from sessionStorage
    const loadDismissed = () => {
      try {
        const stored = sessionStorage.getItem('dismissed_announcements');
        if (stored) setDismissed(new Set(JSON.parse(stored)));
      } catch { /* ignore */ }
    };
    loadDismissed();

    fetch('/api/announcements', { signal: controller.signal })
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to load announcements');
        }
        return res.json();
      })
      .then(data => {
        setAnnouncements(Array.isArray(data.announcements) ? data.announcements : []);
      })
      .catch((error: unknown) => {
        const isAbortError = typeof error === 'object'
          && error !== null
          && 'name' in error
          && error.name === 'AbortError';

        if (isAbortError) return;
        setAnnouncements([]);
      });

    return () => controller.abort();
  }, []);

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    try {
      sessionStorage.setItem('dismissed_announcements', JSON.stringify([...next]));
    } catch {}
  };

  // Show only the latest non-dismissed announcement
  const visible = announcements.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const announcement = visible[0];
  const style = typeStyles[announcement.type] || typeStyles.info;

    return (
      <div
        className="site-announcement"
        role="region"
        aria-label="ประกาศ"
        style={{
        background: style.bg,
        borderBottom: `1px solid ${style.border}`,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
      }}
    >
      <span style={{ fontSize: '0.875rem' }}>{style.icon}</span>
      <Link
        href="/announcements"
        style={{
          flex: 1,
          maxWidth: '900px',
          textAlign: 'center',
          fontWeight: 600,
          color: style.color,
          fontSize: '0.875rem',
          textDecoration: 'none',
          overflowWrap: 'anywhere',
        }}
      >
        {announcement.title}
        <span style={{ marginLeft: '6px', fontSize: '0.75rem', opacity: 0.7 }}>อ่านเพิ่มเติม →</span>
      </Link>
      <button
        onClick={() => dismiss(announcement.id)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: style.color,
          opacity: 0.6,
          padding: '4px',
          minWidth: '44px',
          minHeight: '44px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.125rem',
          lineHeight: 1,
          flexShrink: 0,
        }}
        aria-label="ปิดประกาศ"
      >
        ✕
      </button>
    </div>
  );
}

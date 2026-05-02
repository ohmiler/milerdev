'use client';

export default function AdminNavIcon({ name, size = 18 }: { name: string; size?: number }) {
  const s = { width: size, height: size, flexShrink: 0 };
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (name) {
    case 'dashboard':
      return <svg style={s} viewBox="0 0 24 24" {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
    case 'courses':
    case 'blog':
      return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /><path d="M8 7h8M8 11h8" /></svg>;
    case 'users':
      return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>;
    case 'payments':
      return <svg style={s} viewBox="0 0 24 24" {...p}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M7 15h3" /></svg>;
    case 'enrollments':
      return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M17 11l2 2 4-4" /></svg>;
    case 'reports':
    case 'analytics':
      return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M4 19h16" /><rect x="5" y="10" width="3" height="7" rx="1" /><rect x="10.5" y="6" width="3" height="11" rx="1" /><rect x="16" y="13" width="3" height="4" rx="1" /></svg>;
    case 'media':
      return <svg style={s} viewBox="0 0 24 24" {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>;
    case 'tags':
      return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L2 12V2h10l8.6 8.6a2 2 0 010 2.8z" /><path d="M7 7h.01" /></svg>;
    case 'announcements':
      return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></svg>;
    case 'bundles':
      return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M21 16V8a2 2 0 00-1-1.7l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.7l7 4a2 2 0 002 0l7-4a2 2 0 001-1.7z" /><path d="M3.3 7L12 12l8.7-5M12 22V12" /></svg>;
    case 'coupons':
      return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M3 8a2 2 0 002-2h14a2 2 0 002 2v8a2 2 0 00-2 2H5a2 2 0 00-2-2V8z" /><path d="M12 7v10M8 10h.01M16 14h.01" /></svg>;
    case 'certificates':
      return <svg style={s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="8" r="5" /><path d="M8.8 12.2L7 22l5-3 5 3-1.8-9.8" /></svg>;
    case 'reviews':
      return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M12 2l3.1 6.3L22 9.3l-5 4.9 1.2 6.8L12 17.8 5.8 21 7 14.2 2 9.3l6.9-1L12 2z" /></svg>;
    case 'reconciliation':
      return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M1 4v6h6M23 20v-6h-6" /><path d="M20.5 9A9 9 0 005.6 5.6L1 10m22 4l-4.6 4.4A9 9 0 013.5 15" /></svg>;
    case 'logs':
      return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M4 19V5M8 19V9M12 19V3M16 19v-7M20 19V7" /></svg>;
    case 'settings':
      return <svg style={s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 01-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 01-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 012.8-2.8l.1.1a1.7 1.7 0 001.8.3 1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 012.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8 1.7 1.7 0 001.5 1h.1a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>;
    default:
      return <svg style={s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>;
  }
}

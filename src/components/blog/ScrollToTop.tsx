'use client';

import { useEffect, useState } from 'react';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="กลับขึ้นด้านบน"
      style={{
        position: 'fixed',
        bottom: '32px',
        right: '32px',
        zIndex: 100,
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        background: '#2563eb',
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(37,99,235,0.4)',
        transition: 'background 0.2s, transform 0.2s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#1d4ed8')}
      onMouseLeave={e => (e.currentTarget.style.background = '#2563eb')}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  );
}
